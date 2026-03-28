import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getTickets,
  getTicketStats,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  advanceTicket,
  rejectTicket,
  reopenTicket,
  addComment,
  addDocument,
  addNote,
  assignTicket,
} from '../controllers/ticketController';

const router = Router();

router.use(auth);

router.get('/stats',               getTicketStats);
router.get('/',                    getTickets);
router.get('/:id',                 getTicket);
router.post('/',                   createTicket);
router.patch('/:id',               updateTicket);
router.delete('/:id',              deleteTicket);
router.post('/:id/advance',        advanceTicket);
router.post('/:id/reject',         rejectTicket);
router.post('/:id/reopen',         reopenTicket);
router.post('/:id/comments',       addComment);
router.post('/:id/documents',      addDocument);
router.post('/:id/notes',          addNote);
router.patch('/:id/assign',        assignTicket);

export default router;
