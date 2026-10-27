import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { TrainingControllers } from './training.controller';
import { TrainingValidation } from './training.validation';
import { TrainingInviteControllers } from '../TrainingInvite/trainingInvite.controller';
import { USER_ROLE } from '../Auth/auth.constant';

const router = express.Router();

// ── PUBLIC: Join training by token (NO auth required) ──
router.get(
  '/:id/join/:token',
  TrainingInviteControllers.joinByToken,
);

// ── Training CRUD (Admin only) ──
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('thumbnailImage') as any,
  TrainingControllers.createTraining,
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin,USER_ROLE.company,USER_ROLE.user,USER_ROLE.guest),
  TrainingControllers.getAllTrainings,
);

// ── Get My Trainings (User/Guest) ──
router.get(
  '/my-trainings',
  auth(USER_ROLE.user, USER_ROLE.guest),
  TrainingControllers.getMyTrainings,
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company,USER_ROLE.user,USER_ROLE.guest),
  TrainingControllers.getSingleTraining,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('thumbnailImage') as any,
  TrainingControllers.updateTraining,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TrainingControllers.deleteTraining,
);

// ── Duplicate Training ──
router.post(
  '/:id/duplicate',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.duplicateTrainingSchema),
  TrainingControllers.duplicateTraining,
);

// ── Assign Training to Company/Team ──
router.patch(
  '/:id/assign',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.assignTrainingSchema),
  TrainingControllers.assignTraining,
);

// ── Topic Management ──
router.get(
  '/:id/topics',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin,USER_ROLE.company,USER_ROLE.user,USER_ROLE.guest),
  TrainingControllers.getTopics,
);

router.get(
  '/:id/topics/:topicId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin,USER_ROLE.company,USER_ROLE.user,USER_ROLE.guest),
  TrainingControllers.getSingleTopic,
);

router.post(
  '/:id/topics',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.addTopicSchema),
  TrainingControllers.addTopic,
);

router.patch(
  '/:id/topics/:topicId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.updateTopicSchema),
  TrainingControllers.updateTopic,
);

router.delete(
  '/:id/topics/:topicId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TrainingControllers.deleteTopic,
);

// ── Module ↔ Topic ──
router.post(
  '/:id/topics/:topicId/modules',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.addModuleToTopicSchema),
  TrainingControllers.addModuleToTopic,
);

router.delete(
  '/:id/topics/:topicId/modules/:moduleId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TrainingControllers.removeModuleFromTopic,
);

// ── Reorder Topics ──
router.patch(
  '/:id/reorder-topics',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TrainingValidation.reorderTopicsSchema),
  TrainingControllers.reorderTopics,
);

// ── Company views their trainings ──
router.get(
  '/company/:companyId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  TrainingControllers.getTrainingsByCompany,
);

// ── User views a training (with progress) ──
router.get(
  '/:id/user-view',
  auth(USER_ROLE.user, USER_ROLE.guest, USER_ROLE.company),
  TrainingControllers.getTrainingForUser,
);

// ── Share / Invite Link ──
router.post(
  '/:id/generate-link',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TrainingInviteControllers.generateShareLink,
);

router.post(
  '/:id/send-invite',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  TrainingInviteControllers.sendInvite,
);

// ── Get Invitations List ──
router.get(
  '/:id/invitations',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  TrainingInviteControllers.getInvitations,
);

// ── Resend Invitation Reminder ──
router.post(
  '/invitations/:inviteId/resend',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  TrainingInviteControllers.resendInvite,
);

// ── Authenticate for Training (Public Route) ──
router.post(
  '/:id/authenticate',
  TrainingControllers.authenticateTraining,
);

export const TrainingRoutes = router;
