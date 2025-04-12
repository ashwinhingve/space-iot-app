import express from 'express';
import { auth } from '../middleware/auth';

const router = express.Router();

router.get('/widgets', auth, async (req, res) => {
  // Get user's dashboard widgets
});

router.post('/widgets', auth, async (req, res) => {
  // Save new widget configuration
});

export default router; 