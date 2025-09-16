// backend/src/controllers/TournamentController.js
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Room from '../models/Room.js';
import User from '../models/User.js';

const isId = (v) => mongoose.isValidObjectId(v);
const ownerIdOf = (t) => String(t?.organizationId?._id || t?.organizationId || t?.createdBy || '');
const canModerate = (t, me) =>
  String(t.organizationId) === String(me._id) || me.role === 'admin';
const normalizeId = (value) => {
  if (!value) return '';
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (typeof value === 'object' && value._id) return normalizeId(value._id);
  if (typeof value?.toString === 'function') return value.toString();
  return String(value);
};
const idsMatch = (a, b) => normalizeId(a) === normalizeId(b);
const toObjectId = (value) => {
  if (!value) return null;
  return value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));
};
/* =========================
   CRUD
========================= */

// POST /api/tournaments  (org only)
export const createTournament = async (req, res) => {
  try {
    const {
      title,
      description,
      bannerUrl,
      game,
      startAt,
      endAt,
      capacity,
      price,
      rules,
      prizes,
    } = req.body;

    const organizationId = req.user?._id; // org user creating it
    if (!organizationId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const t = await Tournament.create({
      title,
      description,
      bannerUrl,
      game,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      capacity: Number(capacity) > 0 ? Number(capacity) : 20000,
      price: Number(price) >= 0 ? Number(price) : 0,
      rules,
      prizes,
      organizationId,
      createdBy: organizationId,
    });

    res.status(201).json({ tournament: t });
  } catch (e) {
    console.error('Create tournament failed:', e);
    res.status(500).json({ message: 'Create failed' });
  }
};


// GET /api/tournaments  (public)  → returns {items: [...]}
export const listTournaments = async (req, res) => {
  try {
    const { page = 1, limit = 20, organizationId, active = 'true', participantId } = req.query;

    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (organizationId && isId(organizationId)) filter.organizationId = organizationId;
    if (participantId && isId(participantId)) filter['participants.userId'] = participantId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Tournament.find(filter)
        .populate('organizationId', 'name organizationInfo avatarUrl')
        .sort({ startAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Tournament.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    console.error('List tournaments error:', err);
    res.status(500).json({ message: 'Server error fetching tournaments' });
  }
};

// GET /api/tournaments/:id  (public) → returns {tournament: {...}}
export const getTournament = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const t = await Tournament.findById(id)
      .populate('organizationId', 'name organizationInfo avatarUrl')
      .populate('participants.userId', 'name avatarUrl')

    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    res.json({ tournament: t });
  } catch (e) {
    console.error('Get tournament failed:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/tournaments/:id  (org owner or admin) → {tournament}
export const updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid tournament id' });

    const me = req.user;
    const existing = await Tournament.findById(id);
    if (!existing) return res.status(404).json({ message: 'Tournament not found' });

    if (String(existing.organizationId) !== String(me._id) && me.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const payload = { ...req.body };
    if (payload.startAt) payload.startAt = new Date(payload.startAt);
    if (payload.endAt) payload.endAt = new Date(payload.endAt);

    const updated = await Tournament.findByIdAndUpdate(id, payload, { new: true });
    return res.json({ tournament: updated });
  } catch (err) {
    console.error('updateTournament error:', err);
    return res.status(500).json({ message: 'Failed to update tournament' });
  }
};

/* =========================
   Registration
========================= */

// POST /api/tournaments/:id/register  (player)
export const registerTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user;

    if (!isId(id)) return res.status(400).json({ message: 'Invalid tournament id' });
    if (!me?._id)  return res.status(401).json({ message: 'Not authenticated' });

    const t = await Tournament.findById(id)
      .select('capacity registeredCount participants organizationId')
      .lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    // already registered?
    const already = Array.isArray(t.participants) &&
      t.participants.some(p => String(p.userId) === String(me._id));
    if (already) {
      const fresh = await Tournament.findById(id)
        .populate('organizationId', 'name avatarUrl organizationInfo')
        .lean();
      return res.json({ tournament: fresh });
    }

    // capacity check
    const currentCount = Number(t.registeredCount || 0);
    if (t.capacity && currentCount >= t.capacity) {
      return res.status(400).json({ message: 'Capacity full' });
    }

    // add participant; don't re-validate whole doc (older docs may have startAt missing)
    const updated = await Tournament.findOneAndUpdate(
      { _id: id },
      {
        $addToSet: { participants: { userId: me._id, ign: me.name || '' } },
        $inc: { registeredCount: 1 }
      },
      { new: true, runValidators: false }
    )
    .populate('organizationId', 'name avatarUrl organizationInfo')
    .lean();

    return res.json({ tournament: updated });
  } catch (err) {
    console.error('registerTournament error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

// GET /api/tournaments/:id/participants (org/admin)
export const getParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid tournament id' });

    // load participants with user populated
    const t = await Tournament.findById(id)
     .populate('participants.userId', 'name avatarUrl role');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    // // Use the robust owner helper so this works whether organizationId is an ObjectId or populated doc
    // const ownerIdOf = (t) => String(t?.organizationId?._id || t?.organizationId || t?.createdBy || '');

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);  // ✅ FIX: owner को define करो
    if (me !== String(owner) && req.user.role !== 'admin')  {
      return res.status(403).json({ message: 'Not allowed' });
    }

   return res.json({ participants: Array.isArray(t.participants) ? t.participants : [] });
  } catch (e) {
    console.error('getParticipants error:', e);
    return res.status(500).json({ message: 'Failed to fetch participants' });
  }
};


// DELETE /api/tournaments/:id
export const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid tournament id' });

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // clean up rooms linked to this tournament
    await Room.deleteMany({ tournamentId: id });
    // (यदि bookings/payments वगैरह link हों तो यहाँ handle करना)

    await Tournament.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (e) {
    console.error('deleteTournament error:', e);
    return res.status(500).json({ message: 'Failed to delete tournament' });
  }
};

/* =========================
   Groups
========================= */

// Manually create a room for an existing group
export const createGroupRoom = async (req, res) => {
  try {
    const { id, groupId } = req.params;

    const t = await Tournament.findById(id).select('groups organizationId createdBy').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const actor = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (actor !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const g = (t.groups || []).find(g => String(g._id) === String(groupId));
    if (!g) return res.status(404).json({ message: 'Group not found' });

    if (g.roomId) {
      return res.json({ roomId: g.roomId });
    }

    const room = await Room.create({
      tournamentId: new mongoose.Types.ObjectId(id),
      groupId: group._id,
      groupName: g.name,
      participants: (g.memberIds || []).map(u => ({ userId: u })),
      messages: [{
        senderId: req.user._id,
        content: `Room created for ${g.name}.`,
        type: 'system',
        timestamp: new Date(),
      }],
      settings: { onlyOrgCanMessage: true },
    });

    await Tournament.updateOne(
      { _id: id, 'groups._id': groupId },
      { $set: { 'groups.$.roomId': room._id } },
      { runValidators: false }
    );

    res.status(201).json({ roomId: room._id });
  } catch (e) {
    console.error('createGroupRoom error:', e);
    res.status(500).json({ message: 'Failed to create room' });
  }
};

// POST /api/tournaments/:id/groups/auto?size=4 (org/admin)
export const autoGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const size = Math.max(2, Math.min(16, parseInt(req.query.size, 10) || 4));

    const t = await Tournament.findById(id).select('participants organizationId createdBy groups');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const raw = Array.isArray(t.participants) ? t.participants : [];
    const ids = raw
      .map(p => (p?.userId && p.userId._id) ? p.userId._id : p?.userId)
      .filter(Boolean)
      .map(String);

    // shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    // build groups
    const groups = [];
    for (let i = 0, n = 1; i < ids.length; i += size, n++) {
      const memberIds = ids.slice(i, i + size).map(x => new mongoose.Types.ObjectId(x));
      groups.push({
        _id: new mongoose.Types.ObjectId(),
        groupId: group._id,
        name: `Group ${n}`,
        memberIds,
        roomId: null,
      });
    }

    await Tournament.updateOne
    ({ _id: id }, { $set: { groups } }, 
      { runValidators: false });

    // create room for each group
    for (const g of groups) {
      const room = await Room.create({
        tournamentId: new mongoose.Types.ObjectId(id),
        groupId: group._id,
        groupName: g.name,
        participants: (g.memberIds || []).map(u => ({ userId: u })),
        messages: [{
          senderId: req.user._id,
          content: `Room created for ${g.name} with ${g.memberIds.length} player(s).`,
          type: 'system',
          timestamp: new Date(),
        }],
        settings: { onlyOrgCanMessage: true },
      });

      await Tournament.updateOne(
        { _id: id, 'groups._id': g._id },
        { $set: { 'groups.$.roomId': room._id } },
        { runValidators: false }
      );
    }

    const fresh = await Tournament.findById(id).populate('groups.memberIds', 'name avatarUrl').lean();
    return res.json({ groups: fresh?.groups || [] });
  } catch (e) {
    console.error('autoGroup error:', e);
    return res.status(500).json({ message: 'Failed to create groups / rooms' });
  }
};


// PATCH /api/tournaments/:id/groups/:groupId/room/messages/:messageId
export const editGroupRoomMessage = async (req, res) => {
  try {
    const { id, groupId, messageId } = req.params;
    const { content } = req.body; // केवल text edit; image edit भी चाहें तो allow कर सकते हैं
    if (!isId(id) || !isId(groupId) || !isId(messageId)) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const me = req.user;

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = t.groups.id(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const room = await ensureGroupRoom(id, group);
    const msg = (room.messages || []).find((m) => String(m._id, messageId));
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const isSender = String(msg.senderId, me._id);
    if (!isSender && !canModerate(t, me)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Room.updateOne(
      { _id: room._id, 'messages._id': toObjectId(messageId) },

      {
        $set: {
          'messages.$.content': String(content ?? ''),
          'messages.$.editedAt': new Date(),
        },
      }
    );

    const full = await Room.findById(room._id).lean();
    return res.json({ room: { _id: room._id, messages: full?.messages || [] } });
  } catch (e) {
    console.error('editGroupRoomMessage error:', e);
    return res.status(500).json({ message: 'Failed to edit message' });
  }
};

// DELETE /api/tournaments/:id/groups/:groupId/room/messages/:messageId
export const deleteGroupRoomMessage = async (req, res) => {
  try {
    const { id, groupId, messageId } = req.params;
   if (!isId(id) || !isId(groupId) || !isId(messageId)) {
     return res.status(400).json({ message: 'Bad request' });
   }

   const me = req.user;
   const t = await Tournament.findById(id);
   if (!t) return res.status(404).json({ message: 'Tournament not found' });

   const group = t.groups.id(groupId);
   if (!group) return res.status(404).json({ message: 'Group not found' });

   const room = await ensureGroupRoom(id, group);
   const msg = (room.messages || []).find((m) => String(m._id) === String(messageId));
   if (!msg) return res.status(404).json({ message: 'Message not found' });

   const isSender = String(msg.senderId) === String(me._id);
   if (!isSender && !canModerate(t, me)) {
     return res.status(403).json({ message: 'Not allowed' });
   }

   await Room.updateOne(
     { _id: room._id, 'messages._id': toObjectId(messageId) },
     {
       $set: {
         'messages.$.type': 'deleted',
         'messages.$.content': '',
         'messages.$.imageUrl': null,
         'messages.$.deletedAt': new Date(),
       },
     }
   );
   const full = await Room.findById(room._id).lean();
   return res.json({ room: { _id: room._id, messages: full?.messages || [] } });

    // req.app.get('io')?.to(room._id.toString()).emit('room:message:deleted', { roomId: room._id, messageId });

    return res.json({ ok: true });
  } catch (e) {
    console.error('deleteGroupRoomMessage error', e);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};


export const deleteGroup = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    if (!isId(id) || !isId(groupId)) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const t = await Tournament.findById(id).select('organizationId createdBy groups').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = req.user;
    const isOrg = String(t.organizationId?._id || t.organizationId || t.createdBy) === String(me._id) || me.role === 'admin';
    if (!isOrg) return res.status(403).json({ message: 'Not allowed' });

    const g = (t.groups || []).find(x => String(x._id) === String(groupId));
    if (!g) return res.status(404).json({ message: 'Group not found' });

    // 1) delete linked room (if any)
    if (g.roomId) {
      await Room.deleteOne({ _id: g.roomId });
    } else {
      await Room.deleteOne({ tournamentId: id, groupId }); // in case it exists without being linked
    }

    // 2) remove the group from the tournament
    await Tournament.updateOne(
      { _id: id },
      { $pull: { groups: { _id: groupId } } },
      { runValidators: false }
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error('deleteGroup error:', e);
    return res.status(500).json({ message: 'Failed to delete group' });
  }
};



export const renameGroup = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const { name } = req.body;
    if (!isId(id) || !isId(groupId) || !name?.trim()) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const t = await Tournament.findById(id).select('organizationId createdBy groups');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Tournament.updateOne(
      { _id: id, 'groups._id': groupId },
      { $set: { 'groups.$.name': name.trim() } },
      { runValidators: false }
    );

    const out = await Tournament.findById(id).select('groups').lean();
    return res.json({ groups: out?.groups || [] });
  } catch (e) {
    console.error('renameGroup error:', e);
    return res.status(500).json({ message: 'Failed to rename group' });
  }
};

// POST /api/tournaments/:id/groups/:groupId/remove-member  body: { userId }
export const removeGroupMember = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const { userId } = req.body;
    if (![id, groupId, userId].every(isId)) {
      return res.status(400).json({ message: 'Invalid id(s)' });
    }

    const t = await Tournament.findById(id).select('organizationId createdBy groups').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // pull from group
    await Tournament.updateOne(
      { _id: id, 'groups._id': groupId },
      { $pull: { 'groups.$.memberIds': new mongoose.Types.ObjectId(userId) } },
      { runValidators: false }
    );

    // also remove from room participants (if room exists)
    const cur = await Tournament.findById(id).select('groups').lean();
    const g = cur?.groups?.find(g => String(g._id) === String(groupId));
    if (g?.roomId) {
      await Room.updateOne(
        { _id: g.roomId },
        { $pull: { participants: { userId: new mongoose.Types.ObjectId(userId) } } }
      );
    }

    const out = await Tournament.findById(id).populate('groups.memberIds', 'name avatarUrl').lean();
    return res.json({ groups: out?.groups || [] });
  } catch (e) {
    console.error('removeGroupMember error:', e);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
};

// POST /api/tournaments/:id/groups/move-member  body: { userId, fromGroupId, toGroupId }
export const moveGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, fromGroupId, toGroupId } = req.body;
    if (![id, userId, fromGroupId, toGroupId].every(isId) || fromGroupId === toGroupId) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const t = await Tournament.findById(id).select('organizationId createdBy groups');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    // 1) pull from old
    await Tournament.updateOne(
      { _id: id, 'groups._id': fromGroupId },
      { $pull: { 'groups.$.memberIds': new mongoose.Types.ObjectId(userId) } },
      { runValidators: false }
    );

    // 2) push to new
    await Tournament.updateOne(
      { _id: id, 'groups._id': toGroupId },
      { $addToSet: { 'groups.$.memberIds': new mongoose.Types.ObjectId(userId) } },
      { runValidators: false }
    );

    // rooms sync
    const fresh = await Tournament.findById(id).select('groups').lean();

    const fromG = fresh.groups.find(g => String(g._id) === String(fromGroupId));
    const toG   = fresh.groups.find(g => String(g._id) === String(toGroupId));

    // ensure both rooms exist
    const fromRoom = fromG ? await ensureGroupRoom(t._id, fromG) : null;
    const toRoom   = toG   ? await ensureGroupRoom(t._id, toG)   : null;

    // room participants update
    if (fromRoom) {
      await Room.updateOne(
        { _id: fromRoom._id },
        { $pull: { participants: { userId: new mongoose.Types.ObjectId(userId) } } }
      );
    }
    if (toRoom) {
      await Room.updateOne(
        { _id: toRoom._id, 'participants.userId': { $ne: userId } },
        { $push: { participants: { userId } } }
      );
    }

    const out = await Tournament.findById(id)
      .populate('groups.memberIds', 'name avatarUrl')
      .lean();

    return res.json({ groups: out?.groups || [] });
  } catch (e) {
    console.error('moveGroupMember error:', e);
    return res.status(500).json({ message: 'Failed to move member' });
  }
};


// POST /api/tournaments/:id/groups/:groupId/members  body: { userId }
export const addGroupMember = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(groupId) ||
        !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid id(s)' });
    }

    const t = await Tournament.findById(id).select('groups organizationId createdBy').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const actor = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (actor !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Tournament.updateOne(
      { _id: id, 'groups._id': groupId },
      { $addToSet: { 'groups.$.memberIds': new mongoose.Types.ObjectId(userId) } },
      { runValidators: false }
    );

    // ensure room exists and contains this member
    const t2 = await Tournament.findById(id).select('groups').lean();
    const g = (t2?.groups || []).find(g => String(g._id) === String(groupId));
    if (!g) return res.status(404).json({ message: 'Group not found' });

    let roomId = g.roomId;
    if (!roomId) {
      const room = await Room.create({
        tournamentId: new mongoose.Types.ObjectId(id),
        groupId: group._id,
        groupName: g.name,
        participants: (g.memberIds || []).map(u => ({ userId: u })),
        messages: [{
          senderId: req.user._id,
          content: `Room created for ${g.name}.`,
          type: 'system',
          timestamp: new Date(),
        }],
        settings: { onlyOrgCanMessage: true },
      });
      roomId = room._id;

      await Tournament.updateOne(
        { _id: id, 'groups._id': groupId },
        { $set: { 'groups.$.roomId': roomId } },
        { runValidators: false }
      );
    }

    await Room.updateOne(
      { _id: roomId, 'participants.userId': { $ne: userId } },
      { $push: { participants: { userId } } }
    );

    const out = await Tournament.findById(id)
      .populate('groups.memberIds', 'name avatarUrl')
      .lean();

    // ✅ return array
    res.json(out.groups || []);
  } catch (e) {
    console.error('addGroupMember error:', e);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

// POST /api/tournaments/:id/groups  body: { name, memberIds: [...] } (org/admin)
export const createGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, memberIds } = req.body;

    const t = await Tournament.findById(id).select('organizationId createdBy groups');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const clean = Array.isArray(memberIds)
      ? memberIds.filter(Boolean).map(m => new mongoose.Types.ObjectId(m))
      : [];

    const group = {
      _id: new mongoose.Types.ObjectId(),
      name: (name && String(name).trim()) || `Group ${ (t.groups?.length || 0) + 1 }`,
      memberIds: clean,
      roomId: null,
    };

    await Tournament.updateOne({ _id: id }, { $push: { groups: group } }, { runValidators: false });
    return res.status(201).json({ group });
  } catch (e) {
    console.error('createGroup error:', e);
    return res.status(500).json({ message: 'Failed to create group' });
  }
};


// GET /api/tournaments/:id/groups (org/admin)
export const listGroups = async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id)
      .populate('groups.memberIds', 'name avatarUrl organizationInfo');
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = String(req.user?._id || '');
    const owner = ownerIdOf(t);
    if (me !== owner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    return res.json({ groups: Array.isArray(t.groups) ? t.groups : [] });
  } catch (e) {
    console.error('listGroups error:', e);
    return res.status(500).json({ message: 'Failed to fetch groups' });
  }
};


/* =========================
   Group Rooms (chat)
========================= */


// --- Player: find my group in a tournament ---
export const getMyGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user?._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid tournament id' });
    }
    if (!me) return res.status(401).json({ message: 'Auth required' });

    const t = await Tournament.findById(id).select('groups').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const g = (t.groups || []).find(g =>
      Array.isArray(g.memberIds) && g.memberIds.some((u) => idsMatch(u, me))
    );

    // return null instead of 404 so UI can show "groups not formed yet"
    return res.json({ group: g || null });
  } catch (e) {
    console.error('getMyGroup error:', e);
    return res.status(500).json({ message: 'Failed to fetch my group' });
  }
};


// --- Player: open my group's room (auto-create if needed) & read messages ---
export const getMyGroupRoomMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user?._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid tournament id' });
    }
    if (!me) return res.status(401).json({ message: 'Auth required' });

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = (t.groups || []).find(g =>
      Array.isArray(g.memberIds) && g.memberIds.some((u) => idsMatch(u, me))
    );
    if (!group) return res.status(404).json({ message: 'You are not in any group yet' });

    const room = await (async () => {
      if (group.roomId) return await Room.findById(group.roomId);
      // ensure
      const room = await Room.create({
        tournamentId: t._id,
        groupId: group._id,
        groupName: group.name,
        participants: (group.memberIds || []).map(uid => ({ userId: uid })),
        messages: [{
          senderId: me,
          content: `Room created for ${group.name}.`,
          type: 'system',
          timestamp: new Date(),
        }],
        settings: { onlyOrgCanMessage: true },
      });
      await Tournament.updateOne(
        { _id: id, 'groups._id': group._id },
        { $set: { 'groups.$.roomId': r._id } },
        { runValidators: false }
      );
      return r;
    })();

    const full = await Room.findById(room._id).populate('messages.senderId', 'name avatarUrl role');
    return res.json({ group: { _id: group._id, name: group.name, roomId: room._id }, room: { _id: room._id, messages: full?.messages || [] } });
  } catch (e) {
    console.error('getMyGroupRoomMessages error:', e);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};




// --- Player: send message to my group's room ---
export const sendMyGroupRoomMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user?._id;
    const { content, type = 'text', imageUrl = null } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid tournament id' });
    }
    if (!me) return res.status(401).json({ message: 'Auth required' });

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = (t.groups || []).find(g =>
      Array.isArray(g.memberIds) && g.memberIds.some((u) => idsMatch(u, me))
    );
    if (!group) return res.status(404).json({ message: 'You are not in any group yet' });

    // ensure room
    let roomId = group.roomId;
    if (!roomId) {
      const room = await Room.create({
        tournamentId: t._id,
        groupId: group._id,
        groupName: group.name,
        participants: (group.memberIds || []).map(uid => ({ userId: uid })),
        messages: [],
        settings: { onlyOrgCanMessage: true },
      });
      roomId = room._id;
      await Tournament.updateOne(
        { _id: id, 'groups._id': group._id },
        { $set: { 'groups.$.roomId': roomId } },
        { runValidators: false }
      );
    }

    const message = {
      _id: new mongoose.Types.ObjectId(),
      senderId: me,
      content: String(content || ''),
      type,
      imageUrl,
      timestamp: new Date(),
    };

    await Room.updateOne({ _id: roomId }, { $push: { messages: message } });
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('sendMyGroupRoomMessage error:', e);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};




const ensureGroupRoom = async (tournamentId, group) => {
  let room = null;

  if (group.roomId) {
    room = await Room.findById(group.roomId);
  }

  if (!room) {
     room = await Room.create({
   tournamentId,
   groupId: group._id,                     // ← important
   groupName: group.name,
   participants: (group.memberIds || []).map((uid) => ({ userId: uid })),
   messages: [],
   settings: { onlyOrgCanMessage: true },
 });
    group.roomId = room._id;
    await Tournament.updateOne(
      { _id: tournamentId, 'groups._id': group._id },
      { $set: { 'groups.$.roomId': room._id } },
      { runValidators: false }
    );
  }

  if (room?.messages?.some((msg) => !msg?._id || typeof msg._id === 'string')) {
    const patchedMessages = room.messages.map((msg) => {
      const plain = msg.toObject ? msg.toObject({ depopulate: true }) : { ...msg };
      const currentId = plain._id;
      const normalizedId =
        currentId && typeof currentId !== 'string'
          ? currentId
          : mongoose.Types.ObjectId.isValid(currentId)
          ? new mongoose.Types.ObjectId(currentId)
          : new mongoose.Types.ObjectId();
      return {
        ...plain,
        _id: normalizedId,
      };
    });

    await Room.updateOne(
      { _id: room._id },
      { $set: { messages: patchedMessages } },
      { runValidators: false }
    );

    room = await Room.findById(room._id);
  }

  return room;
};

// GET /api/tournaments/:id/groups/:groupId/room/messages (org/admin OR group member)
export const getGroupRoomMessages = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const me = req.user;

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = t.groups.id(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isOrg = String(t.organizationId) === String(me._id) || me.role === 'admin';
    const isMember = (group.memberIds || []).some((uid) => String(uid) === String(me._id));
    if (!isOrg && !isMember) return res.status(403).json({ message: 'Not allowed' });

    const room = await ensureGroupRoom(id, group);
    const full = await Room.findById(room._id).populate('messages.senderId', 'name avatarUrl role');
    return res.json({ room: { _id: room._id, messages: full?.messages || [] } });
  } catch (e) {
    console.error('getGroupRoomMessages error:', e);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// POST /api/tournaments/:id/groups/:groupId/room/messages (org/admin only by default)
export const sendGroupRoomMessage = async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const me = req.user;
    const { content, type = 'text', imageUrl = null } = req.body;

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = t.groups.id(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isOrg = String(t.organizationId) === String(me._id) || me.role === 'admin';
    if (!isOrg) return res.status(403).json({ message: 'Only organizers can send messages for now' });

    const room = await ensureGroupRoom(id, group);

    const message = {
      _id: new mongoose.Types.ObjectId(),
      senderId: me._id,
      content: String(content || ''),
      type,
      imageUrl,
      timestamp: new Date(),
    };

    await Room.updateOne({ _id: room._id }, { $push: { messages: message } });
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('sendGroupRoomMessage error:', e);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};


export const editMyGroupRoomMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const me = req.user?._id;
    const { content } = req.body;
    if (!isId(id) || !isId(messageId) || !me) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = (t.groups || []).find(g =>
      Array.isArray(g.memberIds) && g.memberIds.some((u) => idsMatch(u, me))
    );
    if (!group) return res.status(403).json({ message: 'Not in any group' });

    const room = await ensureGroupRoom(id, group);
    const msg = (room.messages || []).find((m) => idsMatch(m._id, messageId));
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (!idsMatch(msg.senderId, me)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Room.updateOne(
      { _id: room._id, 'messages._id': toObjectId(messageId) },
      { $set: { 'messages.$.content': String(content ?? ''), 'messages.$.editedAt': new Date() } }
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('editMyGroupRoomMessage error:', e);
    return res.status(500).json({ message: 'Failed to edit message' });
  }
};

export const deleteMyGroupRoomMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const me = req.user?._id;
    if (!isId(id) || !isId(messageId) || !me) {
      return res.status(400).json({ message: 'Bad request' });
    }

    const t = await Tournament.findById(id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const group = (t.groups || []).find(g =>
      Array.isArray(g.memberIds) && g.memberIds.some((u) => idsMatch(u, me))
    );
    if (!group) return res.status(403).json({ message: 'Not in any group' });

    const room = await ensureGroupRoom(id, group);
    const msg = (room.messages || []).find((m) => idsMatch(m._id, messageId));
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (!idsMatch(msg.senderId, me)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Room.updateOne(
      { _id: room._id, 'messages._id': toObjectId(messageId) },
      {
        $set: {
          'messages.$.type': 'deleted',
          'messages.$.content': '',
          'messages.$.imageUrl': null,
          'messages.$.deletedAt': new Date(),
        },
      }
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('deleteMyGroupRoomMessage error:', e);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};


// // controllers/roomController.js
// import Room from '../models/Room.js';

// const findOrCreateRoom = async (tournamentId, groupId, participants = []) => {
//   let room = await Room.findOne({ tournamentId, groupId });
//   if (!room) {
//     room = await Room.create({ tournamentId, groupId, participants });
//   }
//   return room;
// };

// // Send message
// export const sendGroupRoomMessage = async (req, res) => {
//   try {
//     const { tournamentId, groupId } = req.params;
//     const { content, type = 'text', imageUrl = null } = req.body;
//     const senderId = req.user?._id || req.body.senderId;

//     if (!content && !imageUrl) {
//       return res.status(400).json({ error: 'content or imageUrl required' });
//     }

//     const room = await findOrCreateRoom(tournamentId, groupId);
//     const msg = { senderId, content, type, imageUrl };
//     room.messages.push(msg);
//     await room.save();

//     // optional: Socket.IO emit here if you use io instance
//     // req.app.get('io')?.to(room._id.toString()).emit('room:message:new', { roomId: room._id, message: room.messages.at(-1) });

//     return res.status(201).json({ roomId: room._id, message: room.messages.at(-1) });
//   } catch (e) {
//     console.error('sendGroupRoomMessage error', e);
//     res.status(500).json({ error: 'failed_to_send_message' });
//   }
// };

// // Edit message
// export const editGroupRoomMessage = async (req, res) => {
//   try {
//     const { tournamentId, groupId, messageId } = req.params;
//     const { content } = req.body;
//     if (!content) return res.status(400).json({ error: 'content required' });

//     const room = await Room.findOne({ tournamentId, groupId });
//     if (!room) return res.status(404).json({ error: 'room_not_found' });

//     const msg = room.messages.id(messageId);
//     if (!msg) return res.status(404).json({ error: 'message_not_found' });

//     // Optional: only author can edit
//     // if (String(msg.senderId) !== String(req.user._id)) return res.status(403).json({ error: 'forbidden' });

//     msg.content = content;
//     msg.editedAt = new Date();
//     await room.save();

//     // req.app.get('io')?.to(room._id.toString()).emit('room:message:edited', { roomId: room._id, message: msg });

//     return res.json({ message: msg });
//   } catch (e) {
//     console.error('editGroupRoomMessage error', e);
//     res.status(500).json({ error: 'failed_to_edit_message' });
//   }
// };

// // Delete (soft) message
// export const deleteGroupRoomMessage = async (req, res) => {
//   try {
//     const { tournamentId, groupId, messageId } = req.params;
//     const room = await Room.findOne({ tournamentId, groupId });
//     if (!room) return res.status(404).json({ error: 'room_not_found' });

//     const msg = room.messages.id(messageId);
//     if (!msg) return res.status(404).json({ error: 'message_not_found' });

//     // Optional: only author/admin
//     // if (String(msg.senderId) !== String(req.user._id) && !req.user?.isAdmin) return res.status(403).json({ error: 'forbidden' });

//     msg.type = 'deleted';
//     msg.content = '';
//     msg.imageUrl = null;
//     msg.deletedAt = new Date();
//     await room.save();

//     // req.app.get('io')?.to(room._id.toString()).emit('room:message:deleted', { roomId: room._id, messageId });

//     return res.json({ ok: true });
//   } catch (e) {
//     console.error('deleteGroupRoomMessage error', e);
//     res.status(500).json({ error: 'failed_to_delete_message' });
//   }
// };

// DELETE /api/tournaments/:id/groups/:groupId/room
export const deleteGroupRoom = async (req, res) => {
  try {
    const { id, groupId } = req.params;

    const t = await Tournament.findById(id).select('groups organizationId createdBy').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const me = req.user;
    const isOrg = String(t.organizationId?._id || t.organizationId || t.createdBy) === String(me._id) || me.role === 'admin';
    if (!isOrg) return res.status(403).json({ message: 'Not allowed' });

    const g = (t.groups || []).find(x => String(x._id) === String(groupId));
    if (!g) return res.status(404).json({ message: 'Group not found' });

    let deletedRoomId = null;

    if (g.roomId) {
      const gone = await Room.findOneAndDelete({ _id: g.roomId });
      if (gone) deletedRoomId = gone._id;
      await Tournament.updateOne(
        { _id: id, 'groups._id': groupId },
        { $set: { 'groups.$.roomId': null } },
        { runValidators: false }
      );
    } else {
      const gone = await Room.findOneAndDelete({ tournamentId: id, groupName: g.name });
      if (gone) deletedRoomId = gone._id;
    }

    if (!deletedRoomId) return res.status(404).json({ message: 'Room not found' });
    return res.json({ ok: true, deletedRoomId });
  } catch (e) {
    console.error('deleteGroupRoom error', e);
    return res.status(500).json({ message: 'Failed to delete room' });
  }
};






