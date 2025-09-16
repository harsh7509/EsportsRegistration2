// backend/src/controllers/scrimController.js
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import moment from 'moment-timezone';

import Scrim from '../models/Scrim.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/crypto.js';

// ---------- Validation ----------
export const createScrimValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('game').trim().notEmpty().withMessage('Game is required'),
  body('date').optional().isISO8601().withMessage('Valid date required'),
  body('timeSlot.start').optional().isISO8601().withMessage('Valid start time required'),
  body('timeSlot.end').optional().isISO8601().withMessage('Valid end time required'),
  body('capacity').optional().isInt({ min: 2, max: 100 }).withMessage('Capacity must be between 2 and 100'),
];

const TZ = 'Asia/Kolkata';


// ---------- Delete Scrim ----------
export const deleteScrim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(id);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (scrim.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only scrim owner can delete' });
    }

    await Promise.all([
      Booking.deleteMany({ scrimId: id }),
      Room.deleteOne({ scrimId: id }),
      Payment.deleteMany({ scrimId: id }),
      Scrim.findByIdAndDelete(id),
    ]);

    res.json({ message: 'Scrim deleted successfully' });
  } catch (error) {
    console.error('Delete scrim error:', error);
    res.status(500).json({ message: 'Server error deleting scrim' });
  }
};

// ---------- Create Scrim (AM/PM safe) ----------
export const createScrim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      title,
      description,
      game,
      platform,
      date,            // 'YYYY-MM-DD'
      timeSlot,        // can be ISO start/end OR {startTimeStr:'06:00',startAmpm:'PM',endTimeStr:'08:00',endAmpm:'PM'}
      capacity,
      entryFee,
      prizePool,
      room,
    } = req.body;

    const capacityN   = Number(capacity) || 100;
const entryFeeN   = Number(entryFee) || 0;
const prizePoolN  = Number(prizePool) || 0;

    // Normalize timeSlot: accept either full ISO or separate time strings with AM/PM
    let normalizedTimeSlot = { start: null, end: null };

    if (timeSlot?.start && timeSlot?.end) {
      // ISO strings or Date-like → interpret in TZ to keep intended local time
      normalizedTimeSlot.start = moment.tz(timeSlot.start, TZ).toDate();
      normalizedTimeSlot.end = moment.tz(timeSlot.end, TZ).toDate();
    } else if (date && timeSlot && (timeSlot.startTimeStr || timeSlot.startRaw)) {
      const startStr = timeSlot.startTimeStr || timeSlot.startRaw; // '06:00'
      const endStr = timeSlot.endTimeStr || timeSlot.endRaw;       // '08:00'
      const startAmpm = timeSlot.startAmpm || '';                  // 'AM' | 'PM' | ''
      const endAmpm = timeSlot.endAmpm || '';

      if (startStr) {
        const startInput = `${date} ${startStr} ${startAmpm}`.trim();
        const startFmt = startAmpm ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm';
        normalizedTimeSlot.start = moment.tz(startInput, startFmt, TZ).toDate();
      }
      if (endStr) {
        const endInput = `${date} ${endStr} ${endAmpm}`.trim();
        const endFmt = endAmpm ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm';
        normalizedTimeSlot.end = moment.tz(endInput, endFmt, TZ).toDate();
      }
    } else if (date) {
      // Only date → full day range in TZ
      const start = moment.tz(date, 'YYYY-MM-DD', TZ).startOf('day');
      const end = moment(start).endOf('day');
      normalizedTimeSlot.start = start.toDate();
      normalizedTimeSlot.end = end.toDate();
    } else {
      // Fallback
      normalizedTimeSlot.start = new Date();
      normalizedTimeSlot.end = moment().add(2, 'hours').toDate();
    }

    // Encrypt room password if provided
    let encryptedRoom = {};
    if (room?.password) {
      const encrypted = encrypt(room.password);
      encryptedRoom = {
        id: room.id,
        password: JSON.stringify(encrypted),
        revealToParticipants: false,
      };
    }

    const scrim = new Scrim({
      title,
      description,
      game,
      platform,
      date: date ? moment.tz(date, 'YYYY-MM-DD', TZ).toDate() : (normalizedTimeSlot.start || new Date()),
      timeSlot: {
        start: normalizedTimeSlot.start,
        end: normalizedTimeSlot.end,
      },
      capacity: capacityN,
  entryFee: entryFeeN,
  prizePool: prizePoolN,
  isPaid: entryFeeN > 0,
  price: entryFeeN,
      room: encryptedRoom,
      createdBy: req.user._id,
    });

    await scrim.save();
    await scrim.populate('createdBy', 'name organizationInfo');

    // Ensure associated room
    const roomData = {
      scrimId: scrim._id,
      roomId: room?.id || `scrim-${scrim._id}`,
      password: encryptedRoom.password || null,
      settings: {
        onlyOrgCanMessage: true,
        autoRevealCredentials: false,
      },
    };

    const existingRoom = await Room.findOne({ scrimId: scrim._id });
    if (!existingRoom) {
      await Room.create(roomData);
    }

    res.status(201).json({ scrim });
  } catch (error) {
    console.error('Create scrim error:', error);
    res.status(500).json({ message: 'Server error creating scrim' });
  }
};

// ---------- List Scrims (single, paginated version) ----------
export const getScrimsList = async (req, res) => {
  try {
    const {
      game,
      platform,
      date,
      sort = 'rank',
      page = 1,
      limit = 12,
      status,
      entryFee,
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (game) filter.game = new RegExp(game, 'i');
    if (platform) filter.platform = new RegExp(platform, 'i');
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    if (entryFee) {
      if (entryFee === '0') filter.entryFee = 0;
      else if (entryFee === '25') filter.entryFee = 25;
      else if (entryFee === '50') filter.entryFee = 50;
      else if (entryFee === '60+') filter.entryFee = { $gte: 60 };
    }

    let sortOption = {};
    switch (sort) {
      case 'rank':
        sortOption = { rankScore: -1, createdAt: -1 };
        break;
      case 'date':
        sortOption = { date: 1, 'timeSlot.start': 1 };
        break;
      case 'popularity':
        sortOption = { 'participants.length': -1, createdAt: -1 };
        break;
      case 'price':
        sortOption = { entryFee: -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const scrims = await Scrim.find(filter)
      .populate('createdBy', 'name organizationInfo')
      .select('-room.password')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Scrim.countDocuments(filter);

    res.json({
      items: scrims,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get scrims error:', error);
    res.status(500).json({ message: 'Server error fetching scrims' });
  }
};

// ---------- Scrim Details ----------
export const getScrimDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const scrim = await Scrim.findById(id)
      .populate('createdBy', 'name organizationInfo')
      .populate('participants', 'name')
      .populate('ratings.playerId', 'name');

    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    let isBooked = false;
    let booking = null;
    if (userId) {
      booking = await Booking.findOne({
        scrimId: id,
        playerId: userId,
        status: 'active',
      }).populate('playerId', 'name email');
      isBooked = !!booking;
    }

    const scrimData = scrim.toObject();
    if (scrimData.room && scrimData.room.password) {
      const isOwner = userId && scrim.createdBy._id.toString() === userId.toString();
      if (!isOwner && !isBooked) delete scrimData.room.password;
    }

    res.json({ scrim: scrimData, isBooked, booking });
  } catch (error) {
    console.error('Get scrim details error:', error);
    res.status(500).json({ message: 'Server error fetching scrim details' });
  }
};

// ---------- Book Scrim ----------
// ---------- Book Scrim ----------
export const bookScrim = async (req, res) => {
  const session = await mongoose.startSession();
  await session.startTransaction();

  try {
    const { id: scrimId } = req.params;
    const { playerInfo } = req.body;
    const playerId = req.user._id;

    const scrim = await Scrim.findById(scrimId).session(session);
    if (!scrim) throw new Error('Scrim not found');

    // Time window: can book only between start and end
    // Booking allowed any time BEFORE the scrim starts
const start = new Date(scrim.timeSlot?.start || scrim.date);
const now   = new Date();

if (now > start) {
  throw new Error('Booking closed — scrim already started');
}



    // Optionally allow booking when status is 'upcoming' OR 'ongoing'
    if (!['upcoming', 'ongoing'].includes(scrim.status)) {
      throw new Error('Cannot book this scrim at the moment');
    }

    if (Array.isArray(scrim.participants) && scrim.participants.length >= scrim.capacity) {
      throw new Error('Scrim is full');
    }

    const existingBooking = await Booking.findOne({
      scrimId,
      playerId,
      status: 'active',
    }).session(session);
    if (existingBooking) throw new Error('Already booked');

    // add participant
    scrim.participants.push(playerId);
    await scrim.save({ session });

    const [booking] = await Booking.create([{ scrimId, playerId, playerInfo }], { session });

    await session.commitTransaction();
    session.endSession();

    // handle payment / room add exactly as you had
    if (scrim.entryFee > 0) {
      await Payment.create({ scrimId, playerId, amount: scrim.entryFee, status: 'pending' });
    } else {
      const room = await Room.findOne({ scrimId });
      if (room) {
        const exists = room.participants?.some(p => String(p.userId) === String(playerId));
        if (!exists) {
          room.participants.push({ userId: playerId });
          await room.save();
        }
      }
    }

    res.json({
      booking,
      message: 'Successfully booked scrim',
      requiresPayment: scrim.entryFee > 0,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Booking error:', error);
    res.status(400).json({ message: error.message || 'Booking failed' });
  }
};


// ---------- Room Credentials ----------
export const getRoomCredentials = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    const isOwner = scrim.createdBy.toString() === userId.toString();
    let isBooked = false;

    if (!isOwner) {
      const booking = await Booking.findOne({
        scrimId,
        playerId: userId,
        status: 'active',
        paid: true,
      });

      const room = await Room.findOne({ scrimId });
      const isInRoom = room?.participants?.some(
        (p) => p.userId.toString() === userId.toString() && p.status === 'active'
      );
      isBooked = !!booking || !!isInRoom;
    }

    if (!isOwner && !isBooked)
      return res.status(403).json({ message: 'Not authorized to view room credentials' });

    const room = await Room.findOne({ scrimId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    let roomPassword = null;
    if (room.password) {
      try {
        const encryptedData = JSON.parse(room.password);
        roomPassword = decrypt(encryptedData);
      } catch (error) {
        console.error('Failed to decrypt room password:', error);
      }
    }

    res.json({
      roomId: room.roomId,
      roomPassword,
    });
  } catch (error) {
    console.error('Get room credentials error:', error);
    res.status(500).json({ message: 'Server error fetching room credentials' });
  }
};

// ---------- Update Scrim ----------
export const updateScrim = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const scrim = await Scrim.findById(id);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (scrim.createdBy.toString() !== userId.toString())
      return res.status(403).json({ message: 'Only scrim owner can update' });

    // Normalize time updates
    if (updates.timeSlot) {
      const ts = updates.timeSlot;
      if (ts.start) scrim.timeSlot.start = moment.tz(ts.start, TZ).toDate();
      if (ts.end) scrim.timeSlot.end = moment.tz(ts.end, TZ).toDate();
    }
    if (updates.date) scrim.date = moment.tz(updates.date, 'YYYY-MM-DD', TZ).toDate();

    const writable = [
      'title',
      'description',
      'game',
      'platform',
      'capacity',
      'entryFee',
      'prizePool',
      'status',
    ];
    writable.forEach((key) => {
      if (updates[key] !== undefined) scrim[key] = updates[key];
    });

    // Room updates
    if (updates.room) {
      const roomDoc = await Room.findOne({ scrimId: id });
      if (roomDoc) {
        if (updates.room.id) roomDoc.roomId = updates.room.id;
        if (updates.room.password) {
          const encrypted = encrypt(updates.room.password);
          roomDoc.password = JSON.stringify(encrypted);
        }
        await roomDoc.save();

        scrim.room = {
          id: updates.room.id || scrim.room?.id,
          password: roomDoc.password,
          revealToParticipants: scrim.room?.revealToParticipants || false,
        };
      } else {
        const encrypted = updates.room.password
          ? JSON.stringify(encrypt(updates.room.password))
          : null;
        await Room.create({
          scrimId: scrim._id,
          roomId: updates.room.id || `scrim-${scrim._id}`,
          password: encrypted,
          settings: { onlyOrgCanMessage: true, autoRevealCredentials: false },
        });
        scrim.room = {
          id: updates.room.id || scrim.room?.id,
          password: encrypted,
          revealToParticipants: scrim.room?.revealToParticipants || false,
        };
      }
    }

    await scrim.save();
    const updatedScrim = await Scrim.findById(id).populate('createdBy', 'name organizationInfo');
    res.json({ scrim: updatedScrim });
  } catch (error) {
    console.error('Update scrim error:', error);
    res.status(500).json({ message: 'Server error updating scrim' });
  }
};

// ---------- Remove Participant ----------
export const removeParticipant = async (req, res) => {
  try {
    const { id: scrimId, playerId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (scrim.createdBy.toString() !== userId.toString())
      return res.status(403).json({ message: 'Only scrim owner can remove participants' });

    scrim.participants = scrim.participants.filter((p) => p.toString() !== playerId);
    await scrim.save();

    await Booking.deleteOne({ scrimId, playerId });
    await Payment.deleteOne({ scrimId, playerId });

    const room = await Room.findOne({ scrimId });
    if (room) {
      const participant = room.participants.find((p) => p.userId.toString() === playerId);
      if (participant) {
        participant.status = 'removed';
        await room.save();
      }
    }

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ message: 'Server error removing participant' });
  }
};

// ---------- Send Room Message (supports image) ----------
export const sendRoomMessage = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { content = '', type = 'text', imageUrl } = req.body;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    const room = await Room.findOne({ scrimId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Only the org owner can send messages (adjust if players can chat too)
    const isOwner = scrim.createdBy.toString() === userId.toString();
    if (!isOwner) return res.status(403).json({ message: 'Only organization owner can send messages' });

    const allowedTypes = ['text', 'image', 'credentials', 'system'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid message type' });
    }
    if (type === 'image' && !imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required for type=image' });
    }

    const message = {
      senderId: userId,
      content,
      type,
      timestamp: new Date(),
    };
    if (type === 'image') message.imageUrl = imageUrl;

    room.messages.push(message);
    await room.save();

    // Optionally populate sender for immediate echo
    await room.populate('messages.senderId', 'name role');

    return res.json({ message: room.messages[room.messages.length - 1] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};


// ---------- Get Room Messages ----------
export const getRoomMessages = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    const room = await Room.findOne({ scrimId })
      .populate('messages.senderId', 'name role')
      .populate('participants.userId', 'name');

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = scrim.createdBy.toString() === userId.toString();
    const isInRoom = room.participants.some(
      (p) => p.userId?._id?.toString() === userId.toString() && p.status === 'active'
    );
    if (!isOwner && !isInRoom) {
      return res.status(403).json({ message: 'Not authorized to view room' });
    }

    return res.json({ room });
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({ message: 'Server error fetching room messages' });
  }
};

// ---------- Payment ----------
export const processPayment = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { paymentMethod, transactionId } = req.body;
    const playerId = req.user._id;

    const payment = await Payment.findOne({ scrimId, playerId, status: 'pending' });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'completed';
    payment.paymentMethod = paymentMethod;
    payment.transactionId = transactionId;
    payment.paidAt = new Date();
    await payment.save();

    const room = await Room.findOne({ scrimId });
    if (room) {
      const existingParticipant = room.participants.find((p) => p.userId.toString() === playerId.toString());
      if (!existingParticipant) {
        room.participants.push({ userId: playerId });
        await room.save();
      } else {
        existingParticipant.status = 'active';
        await room.save();
      }
    }

    await Booking.findOneAndUpdate({ scrimId, playerId }, { paid: true });

    res.json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

// ---------- Rating ----------
export const rateScrim = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { rating, comment } = req.body;
    const playerId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (scrim.status !== 'completed') return res.status(400).json({ message: 'Can only rate completed scrims' });

    const booking = await Booking.findOne({ scrimId, playerId, status: 'active' });
    if (!booking) return res.status(403).json({ message: 'Only participants can rate scrims' });

    const existingRating = scrim.ratings.find((r) => r.playerId.toString() === playerId.toString());
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.comment = comment;
      existingRating.ratedAt = new Date();
    } else {
      scrim.ratings.push({ playerId, rating, comment });
    }

    const totalRating = scrim.ratings.reduce((sum, r) => sum + r.rating, 0);
    scrim.averageRating = totalRating / scrim.ratings.length;

    await scrim.save();
    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate scrim error:', error);
    res.status(500).json({ message: 'Server error submitting rating' });
  }
};

// ---------- Participants for Org ----------
export const getParticipantDetails = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    if (scrim.createdBy.toString() !== userId.toString())
      return res.status(403).json({ message: 'Only scrim owner can view participant details' });

    const bookings = await Booking.find({ scrimId, status: 'active' }).populate('playerId', 'name email');

    res.json({ participants: bookings });
  } catch (error) {
    console.error('Get participant details error:', error);
    res.status(500).json({ message: 'Server error fetching participant details' });
  }
};
