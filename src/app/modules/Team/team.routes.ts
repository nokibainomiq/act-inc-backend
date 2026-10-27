import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { TeamControllers } from './team.controller';
import { TeamValidation } from './team.validation';

const router = express.Router();

// ── superAdmin or company ──
router.post(
  '/create-team',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  validateRequest(TeamValidation.createTeamSchema),
  TeamControllers.createTeam,
);

router.get(
  '/dropdown',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  TeamControllers.getDropdownTeams,
);

router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  TeamControllers.getAllTeams,
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  validateRequest(TeamValidation.updateTeamSchema),
  TeamControllers.updateTeam,
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  TeamControllers.deleteTeam,
);

// ── Company-scoped routes: admin/superAdmin view teams of a specific company ──
router.get(
  '/company/:companyId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TeamControllers.getAllTeamsByCompany,
);

router.get(
  '/company/:companyId/dropdown',
  // auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TeamControllers.getDropdownTeamsByCompany,
);

export const TeamRoutes = router;
