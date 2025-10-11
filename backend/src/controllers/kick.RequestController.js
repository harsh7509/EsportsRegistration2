// backend/src/controllers/KickRequestController.js
import mongoose from 'mongoose';
import Scrim from '../models/Scrim.js';

// Small helpers
const isParticipant = (scrim, userId) =>
  Array.isArray(scrim.participants) &&
  scrim.participants.some(p => String(p) === String(userId));

const isOrgOrOwner = (scrim, user) => {
  if (!user) return false;
  const ownerMatch = String(scrim.createdBy ?? scrim.owner ?? scrim.orgId) === String(user._id);
  const roleMatch  = ['org','admin','superadmin'].includes(user.role);
  return ownerMatch || roleMatch;
};

export const createKickRequest = async (req, res) => {
  try {
    const { id } = req.params; // scrimId
    const { slotNumber, targetName, reason } = req.body;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid scrim id' });
    }
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      return res.status(400).json({ message: 'slotNumber must be a positive integer' });
    }
    if (!targetName || !targetName.trim()) {
      return res.status(400).json({ message: 'targetName is required' });
    }

     scrim = await Scrim.findById(id);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    // player must be a participant of this scrim
    if (!isParticipant(scrim, userId)) {
      return res.status(403).json({ message: 'Only participants can create kick requests' });
    }

    // prevent duplicate pending request for same slot/target from anyone
    const hasDuplicate = scrim.kickRequests?.some(
      r =>
        r.status === 'pending' &&
        r.slotNumber === slotNumber &&
        r.targetName?.toLowerCase().trim() === targetName.toLowerCase().trim()
    );
    if (hasDuplicate) {
      return res.status(409).json({ message: 'A pending request already exists for this slot/player' });
    }

    // controllers/kick.RequestController.js (pseudo)
const [scrim, booking] = await Promise.all([
  Scrim.findById(id).select("participants").lean(),
  Booking.findOne({ scrimId: id, playerId: req.user._id, paid: true }).lean()
]);

const isParticipant =
  (scrim?.participants || []).some(u => String(u) === String(req.user._id)) ||
  !!booking;

if (!isParticipant) {
  return res.status(403).json({ message: "Only participants can create kick requests" });
}


    const request = {
      requester: userId,
      slotNumber,
      targetName: targetName.trim(),
      reason: reason?.trim() || '',
      status: 'pending',
    };

    scrim.kickRequests.push(request);
    await scrim.save();

    // emit socket event to the scrim room
    const io = req.app.get('io');
    if (io) io.to('scrim:' + id).emit('kickRequest:new', { scrimId: id, request: scrim.kickRequests.at(-1) });

    return res.status(201).json(scrim.kickRequests.at(-1));
  } catch (err) {
    console.error('createKickRequest error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const listKickRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // optional: 'pending' | 'approved' | 'rejected'

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid scrim id' });
    }

    const scrim = await Scrim.findById(id)
      .populate('kickRequests.requester', 'username name email')
      .lean();

    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (!isOrgOrOwner(scrim, req.user)) {
      return res.status(403).json({ message: 'Only org/owner can view kick requests' });
    }

    let list = scrim.kickRequests ?? [];
    if (status) {
      const allowed = ['pending', 'approved', 'rejected'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      list = list.filter(r => r.status === status);
    }

    // sort: newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json(list);
  } catch (err) {
    console.error('listKickRequests error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const resolveKickRequest = async (req, res) => {
  try {
    const { id, reqId } = req.params; // scrimId, requestId
    const { action, orgNote } = req.body; // 'approve' | 'reject'

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(reqId)) {
      return res.status(400).json({ message: 'Invalid id(s)' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
    }

    const scrim = await Scrim.findById(id);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (!isOrgOrOwner(scrim, req.user)) {
      return res.status(403).json({ message: 'Only org/owner can resolve kick requests' });
    }

    const kr = scrim.kickRequests.id(reqId);
    if (!kr) return res.status(404).json({ message: 'Kick request not found' });
    if (kr.status !== 'pending') {
      return res.status(409).json({ message: `Request already ${kr.status}` });
    }

    // If approving, remove/mask participant at requested slot
    if (action === 'approve') {
      // Try to find by slotNumber first
      let beforeCount = scrim.participants?.length ?? 0;
      if (Array.isArray(scrim.participants)) {
        const bySlot = (p) => Number(p.slotNumber) === Number(kr.slotNumber);

        // Also allow name-based fallback in case slot numbers drifted
        const norm = s => (s || '').toLowerCase().trim();
        const byName = (p) =>
          norm(p.ignName ?? p.ign ?? p.name ?? p.playerName) === norm(kr.targetName);

        const newList = scrim.participants.filter(p => !(bySlot(p) || byName(p)));
        // if nothing removed by filter, just mark by flag (optional)
        if (newList.length === beforeCount) {
          // no-op removal; you can toggle a kicked flag if your schema supports it
          // Example: mark all matching as kicked
          scrim.participants = scrim.participants.map(p => {
            if (bySlot(p) || byName(p)) return { ...p, kicked: true };
            return p;
          });
        } else {
          scrim.participants = newList;
        }
      }

      kr.status = 'approved';
    } else {
      kr.status = 'rejected';
    }

    kr.orgNote = orgNote?.trim() || '';
    kr.resolvedAt = new Date();

    await scrim.save();

    const io = req.app.get('io');
    if (io) io.to('scrim:' + id).emit('kickRequest:update', { scrimId: id, request: kr });

    return res.json(kr);
  } catch (err) {
    console.error('resolveKickRequest error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
