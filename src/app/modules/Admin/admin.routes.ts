import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { USER_ROLE } from '../Auth/auth.constant';

const router = express.Router();


router.post('/login', validateRequest(AdminValidation.loginSchema), AdminControllers.loginAdmin);
router.post('/forgot-password', validateRequest(AdminValidation.forgotPasswordSchema), AdminControllers.forgotPassword);
router.post('/reset-password', validateRequest(AdminValidation.resetPasswordSchema), AdminControllers.resetPassword);


router.patch(
  '/update-profile',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any, // Multer error fix
  AdminControllers.updateProfile
);

router.post(
  '/change-password',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdminValidation.changePasswordSchema),
  AdminControllers.changePassword
);



router.post(
  '/create-admin',
  auth(USER_ROLE.superAdmin),
  validateRequest(AdminValidation.createAdminSchema),
  AdminControllers.createAdmin
);
router.post('/resendOtp', AdminControllers.resendOtp);

router.patch(
  '/block-unblock/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.blockUnblockUser
);

// ── Super Admin only ──
router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin),
  AdminControllers.deleteAdmin
);

router.patch(
  '/block-unblock-admin/:id',
  auth(USER_ROLE.superAdmin),
  AdminControllers.blockUnblockAdmin
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdminControllers.getAllAdmins
);

export const AdminRoutes = router;