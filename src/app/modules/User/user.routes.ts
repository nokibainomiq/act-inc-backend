import express from 'express';
import auth from '../../middleware/auth';
import { UserControllers } from './user.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

// ── Admin / SuperAdmin Routes ──
router.get('/', auth('admin', 'superAdmin'), UserControllers.getAllUsers);

// ── Company: see own employees/users ──
router.get(
  '/company-users',
  auth('company'),
  UserControllers.getUsersByCompany,
);

// ── Authenticated User Routes ──
router.get(
  '/me',
  auth('user', 'admin', 'superAdmin', 'company', 'guest'),
  UserControllers.getMe
);

router.patch(
  '/update-me',
  auth('user', 'admin', 'superAdmin', 'company', 'guest'),
  upload.single('image') as any,
  UserControllers.updateProfile
);

router.patch(
  '/setup-profile',
  auth('user', 'admin', 'superAdmin', 'company', 'guest'),
  upload.single('image') as any,
  UserControllers.setupProfile
);

export const UserRoutes = router;