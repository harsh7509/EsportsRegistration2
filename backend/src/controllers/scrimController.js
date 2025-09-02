import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Scrim from '../models/Scrim.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export const deleteScrim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(id);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Check if user is the owner
    if (scrim.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only scrim owner can delete' });
    }

    // Delete related data
    await Promise.all([
      Booking.deleteMany({ scrimId: id }),
      Room.deleteOne({ scrimId: id }),
      Payment.deleteMany({ scrimId: id }),
      Scrim.findByIdAndDelete(id)
    ]);

    res.json({ message: 'Scrim deleted successfully' });
  } catch (error) {
    console.error('Delete scrim error:', error);
    res.status(500).json({ message: 'Server error deleting scrim' });
  }
};

export const createScrimValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('game').trim().notEmpty().withMessage('Game is required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('timeSlot.start').isISO8601().withMessage('Valid start time required'),
  body('timeSlot.end').isISO8601().withMessage('Valid end time required'),
  body('capacity').isInt({ min: 2, max: 100 }).withMessage('Capacity must be between 2 and 100')
];

export const createScrim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, game, platform, date, timeSlot, capacity, entryFee, prizePool, room } = req.body;

    // Encrypt room password if provided
    let encryptedRoom = {};
    if (room && room.password) {
      const encrypted = encrypt(room.password);
      encryptedRoom = {
        id: room.id,
        password: JSON.stringify(encrypted),
        revealToParticipants: false
      };
    }

    const scrim = new Scrim({
      title,
      description,
      game,
      platform,
      date,
      timeSlot,
      capacity,
      entryFee: entryFee || 0,
      prizePool,
      isPaid: (entryFee && entryFee > 0),
      price: entryFee || 0,
      room: encryptedRoom,
      createdBy: req.user._id
    });

    await scrim.save();
    await scrim.populate('createdBy', 'name organizationInfo');

    // Create associated room
    const roomData = {
      scrimId: scrim._id,
      roomId: room?.id || `scrim-${scrim._id}`,
      password: encryptedRoom.password || null,
      settings: {
        onlyOrgCanMessage: true,
        autoRevealCredentials: false
      }
    };

    await Room.create(roomData);
    res.status(201).json({ scrim });
  } catch (error) {
    console.error('Create scrim error:', error);
    res.status(500).json({ message: 'Server error creating scrim' });
  }
};

export const getScrimsList = async (req, res) => {
  try {
    const {
      game,
      platform,
      date,
      sort = 'rank',
      page = 1,
      limit = 12,
      status = 'upcoming',
      entryFee
    } = req.query;

    const filter = { status };

    if (game) filter.game = new RegExp(game, 'i');
    if (platform) filter.platform = new RegExp(platform, 'i');
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    if (entryFee) {
      if (entryFee === 'free') filter.entryFee = 0;
      else if (entryFee === 'paid') filter.entryFee = { $gt: 0 };
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
      .select('-room.password') // Never include room password in list
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Scrim.countDocuments(filter);

    res.json({
      items: scrims,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get scrims error:', error);
    res.status(500).json({ message: 'Server error fetching scrims' });
  }
};

export const getScrimDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const scrim = await Scrim.findById(id)
      .populate('createdBy', 'name organizationInfo')
      .populate('participants', 'name')
      .populate('ratings.playerId', 'name');

    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Check if user is booked
    let isBooked = false;
    let booking = null;
    if (userId) {
      booking = await Booking.findOne({ 
        scrimId: id, 
        playerId: userId, 
        status: 'active' 
      }).populate('playerId', 'name email');
      isBooked = !!booking;
    }

    // Remove room password from response unless user is authorized
    const scrimData = scrim.toObject();
    if (scrimData.room && scrimData.room.password) {
      const isOwner = userId && scrim.createdBy._id.toString() === userId.toString();
      if (!isOwner && !isBooked) {
        delete scrimData.room.password;
      }
    }

    res.json({ scrim: scrimData, isBooked, booking });
  } catch (error) {
    console.error('Get scrim details error:', error);
    res.status(500).json({ message: 'Server error fetching scrim details' });
  }
};

export const bookScrim = async (req, res) => {
  const session = await mongoose.startSession();
  await session.startTransaction();

  try {
    const { id: scrimId } = req.params;
    const { playerInfo } = req.body;
    const playerId = req.user._id;

    const scrim = await Scrim.findById(scrimId).session(session);
    if (!scrim) {
      throw new Error('Scrim not found');
    }

    if (scrim.status !== 'upcoming') {
      throw new Error('Cannot book non-upcoming scrim');
    }

    // Check capacity
    if (scrim.participants.length >= scrim.capacity) {
      throw new Error('Scrim is full');
    }

    // Check duplicate booking
    const existingBooking = await Booking.findOne({ 
      scrimId, 
      playerId,
      status: 'active'
    }).session(session);

    if (existingBooking) {
      throw new Error('Already booked');
    }

    // Add participant atomically
    scrim.participants.push(playerId);
    await scrim.save({ session });

    // Create booking with player info
    const booking = await Booking.create([{
      scrimId,
      playerId,
      playerInfo
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // If has entry fee, create payment record
    if (scrim.entryFee > 0) {
      await Payment.create({
        scrimId,
        playerId,
        amount: scrim.entryFee,
        status: 'pending'
      });
    } else {
      // For free scrims, add to room immediately
      const room = await Room.findOne({ scrimId });
      if (room) {
        room.participants.push({ userId: playerId });
        await room.save();
      }
    }

    res.json({ 
      booking: booking[0],
      message: 'Successfully booked scrim',
      requiresPayment: scrim.entryFee > 0
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Booking error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getRoomCredentials = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Check if user is authorized (owner or booked participant)
    const isOwner = scrim.createdBy.toString() === userId.toString();
    let isBooked = false;

    if (!isOwner) {
      const booking = await Booking.findOne({
        scrimId,
        playerId: userId,
        status: 'active',
        paid: true
      });
      
      // Also check if user is in the room participants
      const room = await Room.findOne({ scrimId });
      const isInRoom = room?.participants.some(p => 
        p.userId.toString() === userId.toString() && p.status === 'active'
      );
      
      isBooked = !!booking || isInRoom;
    }

    if (!isOwner && !isBooked) {
      return res.status(403).json({ message: 'Not authorized to view room credentials' });
    }

    // Get room data
    const room = await Room.findOne({ scrimId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    let roomPassword = null;
    
    // Decrypt room password if it exists
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
      roomPassword
    });
  } catch (error) {
    console.error('Get room credentials error:', error);
    res.status(500).json({ message: 'Server error fetching room credentials' });
  }
};

export const updateScrim = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const scrim = await Scrim.findById(id);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Check if user is the owner
    if (scrim.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only scrim owner can update' });
    }

    // Update scrim
    Object.assign(scrim, updates);
    await scrim.save();

    // Update room if room credentials changed
    if (updates.room) {
      const room = await Room.findOne({ scrimId: id });
      if (room) {
        if (updates.room.id) room.roomId = updates.room.id;
        if (updates.room.password) {
          const encrypted = encrypt(updates.room.password);
          room.password = encrypted ? JSON.stringify(encrypted) : null;
        }
        await room.save();
        
        // Also update the scrim's room info for consistency
        scrim.room = {
          id: updates.room.id || scrim.room?.id,
          password: room.password,
          revealToParticipants: scrim.room?.revealToParticipants || false
        };
        await scrim.save();
      }
    }

    // Return updated scrim with populated data
    const updatedScrim = await Scrim.findById(id).populate('createdBy', 'name organizationInfo');
    res.json({ scrim: updatedScrim });
  } catch (error) {
    console.error('Update scrim error:', error);
    res.status(500).json({ message: 'Server error updating scrim' });
  }
};

export const removeParticipant = async (req, res) => {
  try {
    const { id: scrimId, playerId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Check if user is the owner
    if (scrim.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only scrim owner can remove participants' });
    }

    // Remove from scrim participants
    scrim.participants = scrim.participants.filter(p => p.toString() !== playerId);
    await scrim.save();

    // Delete booking completely so player can rebook
    await Booking.deleteOne({ scrimId, playerId });

    // Delete payment record if exists
    await Payment.deleteOne({ scrimId, playerId });

    // Remove from room
    const room = await Room.findOne({ scrimId });
    if (room) {
      const participant = room.participants.find(p => p.userId.toString() === playerId);
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

export const sendRoomMessage = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    const room = await Room.findOne({ scrimId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check permissions - only org owner can send messages
    const isOwner = scrim.createdBy.toString() === userId.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'Only organization owner can send messages' });
    }

    // Add message
    room.messages.push({
      senderId: userId,
      content,
      type
    });
    await room.save();

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

export const getRoomMessages = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    const room = await Room.findOne({ scrimId })
      .populate('messages.senderId', 'name role')
      .populate('participants.userId', 'name');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check permissions
    const isOwner = scrim.createdBy.toString() === userId.toString();
    
    // Check if user is in room participants
    const isInRoom = room.participants.some(p => 
      p.userId._id.toString() === userId.toString() && p.status === 'active'
    );

    if (!isOwner && !isInRoom) {
      return res.status(403).json({ message: 'Not authorized to view room' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({ message: 'Server error fetching room messages' });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { paymentMethod, transactionId } = req.body;
    const playerId = req.user._id;

    const payment = await Payment.findOne({ scrimId, playerId, status: 'pending' });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Simulate successful payment
    payment.status = 'completed';
    payment.paymentMethod = paymentMethod;
    payment.transactionId = transactionId;
    payment.paidAt = new Date();
    await payment.save();

    // Add player to room after successful payment
    const room = await Room.findOne({ scrimId });
    if (room) {
      const existingParticipant = room.participants.find(p => 
        p.userId.toString() === playerId.toString()
      );
      
      if (!existingParticipant) {
        room.participants.push({ userId: playerId });
        await room.save();
      } else {
        existingParticipant.status = 'active';
        await room.save();
      }
    }

    // Update booking as paid
    await Booking.findOneAndUpdate(
      { scrimId, playerId },
      { paid: true }
    );

    res.json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

export const rateScrim = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const { rating, comment } = req.body;
    const playerId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    if (scrim.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed scrims' });
    }

    // Check if player participated
    const booking = await Booking.findOne({ scrimId, playerId, status: 'active' });
    if (!booking) {
      return res.status(403).json({ message: 'Only participants can rate scrims' });
    }

    // Check if already rated
    const existingRating = scrim.ratings.find(r => r.playerId.toString() === playerId.toString());
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.comment = comment;
      existingRating.ratedAt = new Date();
    } else {
      scrim.ratings.push({ playerId, rating, comment });
    }

    // Calculate average rating
    const totalRating = scrim.ratings.reduce((sum, r) => sum + r.rating, 0);
    scrim.averageRating = totalRating / scrim.ratings.length;

    await scrim.save();
    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Rate scrim error:', error);
    res.status(500).json({ message: 'Server error submitting rating' });
  }
};

export const getParticipantDetails = async (req, res) => {
  try {
    const { id: scrimId } = req.params;
    const userId = req.user._id;

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found' });
    }

    // Only org owner can view participant details
    if (scrim.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only scrim owner can view participant details' });
    }

    const bookings = await Booking.find({ scrimId, status: 'active' })
      .populate('playerId', 'name email');

    res.json({ participants: bookings });
  } catch (error) {
    console.error('Get participant details error:', error);
    res.status(500).json({ message: 'Server error fetching participant details' });
  }
};