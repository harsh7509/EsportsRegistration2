import express from 'express';
import { authenticate, roleGuard } from '../middlewares/auth.js';
import {
  createScrim,
  createScrimValidation,
  getScrimsList,
  getScrimDetails,
  bookScrim,
  getRoomCredentials,
  updateScrim,
  removeParticipant,
  sendRoomMessage,
  getRoomMessages,
  processPayment,
  deleteScrim,
  rateScrim,
  getParticipantDetails
} from '../controllers/scrimController.js';

const router = express.Router();

// Public routes
router.get('/', getScrimsList);
router.get('/:id', authenticate, getScrimDetails);

// Protected routes
router.post('/', authenticate, roleGuard(['organization']), createScrimValidation, createScrim);
router.post('/:id/book', authenticate, roleGuard(['player']), bookScrim);
router.get('/:id/room', authenticate, getRoomCredentials);

// Organization management routes
router.put('/:id', authenticate, roleGuard(['organization']), updateScrim);
router.delete('/:id', authenticate, roleGuard(['organization']), deleteScrim);
router.delete('/:id/participants/:playerId', authenticate, roleGuard(['organization']), removeParticipant);

// Room management
router.get('/:id/room/messages', authenticate, getRoomMessages);
router.post('/:id/room/messages', authenticate, sendRoomMessage);

// Rating system
router.post('/:id/rate', authenticate, roleGuard(['player']), rateScrim);

// Participant details for org
router.get('/:id/participants', authenticate, roleGuard(['organization']), getParticipantDetails);

// Payment processing
router.post('/:id/payment', authenticate, roleGuard(['player']), processPayment);

export default router;