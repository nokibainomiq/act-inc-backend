import express, { NextFunction, Request, Response } from 'express';
import { AuthControllers } from './auth.controller';
import { USER_ROLE } from './auth.constant';
import { AuthValidation } from './authValidation';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';

const router = express.Router();

// ── Flow 4: Email Signup (Employee - requires companyId + teamId) ──
router.post('/register',
  validateRequest(AuthValidation.registerSchema),
  AuthControllers.registerUser,
);

// ── Flow 1, 2, 4: Standard Email/Password Login ──
router.post('/login',
  validateRequest(AuthValidation.loginSchema),
  AuthControllers.userLogin,
);

// ── Flow 3: Employee ID Login (Just-in-Time Registration) ──
router.post('/employee-id-login',
  validateRequest(AuthValidation.employeeIdLoginSchema),
  AuthControllers.employeeIdLogin,
);

// ── QR Code Generation (Company/Admin/SuperAdmin) ──
router.post('/generate-qr',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  validateRequest(AuthValidation.generateQRSchema),
  AuthControllers.generateQRCode,
);

// ── Flow 5: Guest Login (Anonymous via Passcode) ──
router.post('/guest-login',
  validateRequest(AuthValidation.guestLoginSchema),
  AuthControllers.guestLogin,
);

// ── Flow 6: QR Code Login/Registration ──
router.post('/qr-login',
  validateRequest(AuthValidation.qrCodeLoginSchema),
  AuthControllers.qrCodeLogin,
);

// ── Existing Routes ──
router.post('/resendOtp', AuthControllers.resendOtp);
router.post('/changePassword',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company, USER_ROLE.user),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthControllers.changePassword,
);
router.post('/refresh-token', AuthControllers.refreshToken);
router.post('/forgotPass', AuthControllers.forgotPassword);
router.post('/resetPass', AuthControllers.resetPassword);
router.post('/regOtpVerify',
  validateRequest(AuthValidation.verifyOtpSchema),
  AuthControllers.VerifyOtpForRegistration,
);
router.post('/logout',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company, USER_ROLE.user),
  AuthControllers.logout,
);

export const AuthRoutes = router;