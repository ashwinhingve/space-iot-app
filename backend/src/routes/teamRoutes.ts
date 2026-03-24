import { Router } from 'express';
import { auth } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { getTeams, getTeam, createTeam, updateTeam, addTeamMember, removeTeamMember, deleteTeam } from '../controllers/teamController';

const router = Router();

router.use(auth);

router.get('/', getTeams);
router.get('/:id', getTeam);
router.post('/', authorize('admin'), createTeam);
router.patch('/:id', authorize('admin'), updateTeam);
router.post('/:id/members', authorize('admin'), addTeamMember);
router.delete('/:id/members/:userId', authorize('admin'), removeTeamMember);
router.delete('/:id', authorize('admin'), deleteTeam);

export default router;
