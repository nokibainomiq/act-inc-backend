import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { FeaturedTrainingControllers } from './featuredTraining.controller';
import { FeaturedTrainingValidation } from './featuredTraining.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  validateRequest(FeaturedTrainingValidation.createFeaturedTrainingZodSchema),
  FeaturedTrainingControllers.createFeaturedTraining
);

router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin,USER_ROLE.guest),
  FeaturedTrainingControllers.getFeaturedTrainings
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  FeaturedTrainingControllers.deleteFeaturedTraining
);

export const FeaturedTrainingRoutes = router;
