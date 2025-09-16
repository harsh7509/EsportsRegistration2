import express from 'express';
import { authenticate } from '../middlewares/auth.js';

import {
  createTournament,
  listTournaments,
  getTournament,
  updateTournament,
  registerTournament,
  getParticipants,
  autoGroup,
  addGroupMember,
  createGroup,
  listGroups,
  getGroupRoomMessages,
  sendGroupRoomMessage,
  createGroupRoom,
  getMyGroup,
  getMyGroupRoomMessages,
  sendMyGroupRoomMessage,
  deleteTournament,
  renameGroup,
  removeGroupMember,
  moveGroupMember,
  editGroupRoomMessage,
  deleteGroupRoomMessage,
  editMyGroupRoomMessage,
  deleteMyGroupRoomMessage,
} from '../controllers/TournamentController.js';

const router = express.Router();

// public
router.get('/', listTournaments);
router.get('/:id', getTournament);

// org/admin
router.post('/', authenticate, createTournament);
router.put('/:id', authenticate, updateTournament);
router.post('/:id/register', authenticate, registerTournament);


// --- tournament delete ---
router.delete('/:id', authenticate, deleteTournament);

// --- group management (org/admin) ---
router.post('/:id/groups/:groupId/rename', authenticate, renameGroup);
router.post('/:id/groups/:groupId/remove-member', authenticate, removeGroupMember);
router.post('/:id/groups/move-member', authenticate, moveGroupMember); // body: { userId, fromGroupId, toGroupId }

// --- room messages (org/admin OR sender) ---
router.patch('/:id/groups/:groupId/room/messages/:messageId', authenticate, editGroupRoomMessage);
router.delete('/:id/groups/:groupId/room/messages/:messageId', authenticate, deleteGroupRoomMessage);

// (optional) player self-service for own message in "my-group" room
router.patch('/:id/my-group/room/messages/:messageId', authenticate, editMyGroupRoomMessage);
router.delete('/:id/my-group/room/messages/:messageId', authenticate, deleteMyGroupRoomMessage);


// participants & groups (org/admin)
router.get('/:id/participants', authenticate, getParticipants);
router.post('/:id/groups/auto', authenticate, autoGroup);
router.post('/:id/groups', authenticate, createGroup);
router.get('/:id/groups', authenticate, listGroups);
router.post('/:id/groups/:groupId/members', authenticate, addGroupMember);

// group rooms (org/admin)
router.post('/:id/groups/:groupId/room', authenticate, createGroupRoom);
router.get('/:id/groups/:groupId/room/messages', authenticate, getGroupRoomMessages);
router.post('/:id/groups/:groupId/room/messages', authenticate, sendGroupRoomMessage);

// player/self (correct middleware name)
router.get('/:id/my-group', authenticate, getMyGroup);
router.get('/:id/my-group/room/messages', authenticate, getMyGroupRoomMessages);
router.post('/:id/my-group/room/messages', authenticate, sendMyGroupRoomMessage);

export default router;
