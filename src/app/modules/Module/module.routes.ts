import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { ModuleControllers } from './module.controller';
import { ModuleValidation } from './module.validation';
import { USER_ROLE } from '../Auth/auth.constant';

const router = express.Router();

// ── Create Module (multipart for any dynamic files) ──
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.any() as any,
  ModuleControllers.createModule,
);

// ── Duplicate Module ──
router.post(
  '/duplicate/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ModuleValidation.duplicateModuleSchema),
  ModuleControllers.duplicateModule,
);

// ── Get All Modules ──
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.getAllModules,
);

// ── Get All Modules for Dropdown ──
router.get(
  '/dropdown',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.getAllModulesForDropdown,
);

// ── Get Single Module ──
router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.getModuleById,
);

// ── Update Module ──
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.any() as any,
  ModuleControllers.updateModule,
);

// ── Delete Module ──
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.deleteModule,
);

// ── Assign Modules to Team (single or bulk) ──
router.post(
  '/assign',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ModuleValidation.assignModuleSchema),
  ModuleControllers.assignModulesToTeam,
);

// ── Unassign Module from Team ──
router.post(
  '/unassign/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.unassignModuleFromTeam,
);

// ── Get Modules by Team ──
router.get(
  '/team/:teamId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ModuleControllers.getModulesByTeam,
);

// ── Get Modules by Company (via teams) ──
router.get(
  '/company/:companyId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.company),
  ModuleControllers.getModulesByCompany,
);

export const ModuleRoutes = router;
