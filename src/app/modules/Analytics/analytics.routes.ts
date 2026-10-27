import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { AnalyticsControllers } from './analytics.controller';

const router = express.Router();

router.get(
  '/module/:moduleId/question-stats',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  AnalyticsControllers.getModuleQuestionStats
);

export const AnalyticsRoutes = router;
