import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { UserProgressControllers } from './userProgress.controller';
import { UserProgressValidation } from './userProgress.validation';

const router = express.Router();

// ── User / Guest: Learning Path & Dashboard ──
router.get(
  '/my-learning-path',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getMyLearningPath,
);

// ── User / Guest: Get Single Module Details & Questions ──
router.get(
  '/module/:moduleId',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getModuleForUser,
);

// ── User / Guest: Submit Answer for Question ──
router.post(
  '/submit-answer',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  validateRequest(UserProgressValidation.submitAnswerSchema),
  UserProgressControllers.submitAnswer,
);

// ── User / Guest: Complete Module ──
router.post(
  '/complete/:moduleId',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  validateRequest(UserProgressValidation.completeModuleSchema),
  UserProgressControllers.completeModule,
);

// ── Team Performance Stats ──
router.get(
  '/team-performance',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getTeamPerformance,
);
router.get(
  '/team-performance/:teamId',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getTeamPerformance,
);

// ── Company Performance Stats ──
router.get(
  '/company-performance',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getCompanyPerformance,
);
router.get(
  '/company-performance/:companyId',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.guest),
  UserProgressControllers.getCompanyPerformance,
);

export const UserProgressRoutes = router;
