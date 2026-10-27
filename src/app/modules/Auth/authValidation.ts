import { z } from 'zod';

export const AuthValidation = {
  // ── Flow 4: Email Signup (Employee) ──
  registerSchema: z.object({
    body: z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
      companyId: z.string({ required_error: 'Company ID is required' }),
      teamId: z.string({ required_error: 'Team ID is required' }),
    }),
  }),

  // ── Flow 1, 2, 4: Email/Password Login ──
  loginSchema: z.object({
    body: z.object({
      identifier: z.string({ required_error: 'Email or Phone is required' }),
      password: z.string({ required_error: 'Password is required' }),
      fcmToken: z.string().optional(),
    }),
  }),

  // ── Flow 3: Employee ID Login ──
  employeeIdLoginSchema: z.object({
    body: z.object({
      employeeId: z.string({ required_error: 'Employee ID is required' }),
      companyId: z.string({ required_error: 'Company ID is required' }),
      teamId: z.string({ required_error: 'Team ID is required' }),
      firstName: z.string({ required_error: 'First name is required' }),
      lastName: z.string({ required_error: 'Last name is required' }),
    }),
  }),

  // ── Flow 5: Guest Login (Anonymous via Passcode) ──
  guestLoginSchema: z.object({
    body: z.object({
      passcode: z.string({ required_error: 'Passcode is required' }),
      companyId: z.string({ required_error: 'Company ID is required' }),
      teamId: z.string({ required_error: 'Team ID is required' }),
    }),
  }),

  // ── Flow 6: QR Code Login/Registration (Fully Automatic) ──
  qrCodeLoginSchema: z.object({
    body: z.object({
      qrToken: z.string({ required_error: 'QR token is required' }),
      guestId: z.string().optional(),
    }),
  }),

  changePasswordSchema: z.object({
    body: z.object({
      oldPassword: z.string().min(1, 'Old password is required'),
      newPassword: z.string().min(8, 'New password must be 8 characters'),
    }),
  }),

  verifyOtpSchema: z.object({
    body: z.object({
      identifier: z.string({ required_error: 'Email or phone is required' }),
      otp: z.string().length(6, { message: 'OTP must be 6 digits' }),
    }),
  }),

  forgotPasswordSchema: z.object({
    body: z.object({
      phone: z.string(),
    }),
  }),

  resetPasswordSchema: z.object({
    body: z.object({
      phone: z.string(),
      otp: z.string().length(6),
      newPassword: z.string().min(8),
    }),
  }),

  // ── QR Code Generation ──
  generateQRSchema: z.object({
    body: z.object({
      companyId: z.string({ required_error: 'Company ID is required' }),
      teamId: z.string({ required_error: 'Team ID is required' }),
    }),
  }),

  refreshTokenValidationSchema: z.object({
    body: z.object({
      refreshToken: z.string({ required_error: 'Refresh Token is required!' }),
    }),
  }),
};