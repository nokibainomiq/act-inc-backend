import express from 'express';
import { TrainingInviteControllers } from './trainingInvite.controller';

const router = express.Router();

// ── PUBLIC: Get training by token (NO auth required) ──
router.get(
  '/by-token/:token',
  TrainingInviteControllers.joinByToken,
);

export const TrainingInviteRoutes = router;
