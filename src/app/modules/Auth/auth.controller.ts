import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.services';

// ── Flow 4: Email Signup (Employee) ──
const registerUser = catchAsync(async (req, res) => {
  const result = await AuthServices.registerUser(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'OTP sent to email', data: result });
});

// ── Flow 1, 2, 4: Email/Password Login ──
const userLogin = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true });
  sendResponse(res, { statusCode: 200, success: true, message: 'Login Success', data: result });
});

// ── Flow 3: Employee ID Login (Just-in-Time) ──
const employeeIdLogin = catchAsync(async (req, res) => {
  const result = await AuthServices.employeeIdLogin(req.body);
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true });
  sendResponse(res, { statusCode: 200, success: true, message: 'Employee ID login successful', data: result });
});

// ── Flow 5: Guest Login (Anonymous via Passcode) ──
const guestLogin = catchAsync(async (req, res) => {
  const result = await AuthServices.guestLogin(req.body);
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true });
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: result });
});

// ── Flow 6: QR Code Login/Registration ──
const qrCodeLogin = catchAsync(async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const payload = {
    ...req.body,
    authToken: req.headers.authorization ? req.headers.authorization.split(' ')[1] : undefined,
    guestIdHeader: (req.headers['guest-id'] || req.headers['x-guest-id']) as string | undefined,
    cookieGuestId: req.cookies?.guestId,
    cookieRefreshToken: req.cookies?.refreshToken,
    clientIp,
    userAgent,
  };

  const result = await AuthServices.qrCodeLogin(payload);

  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true, sameSite: 'none' });
  if (result.user?.guestId) {
    res.cookie('guestId', result.user.guestId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  }

  sendResponse(res, { 
    statusCode: 200, 
    success: true, 
    message: result.isNewUser ? 'Registration via QR code successful' : 'QR code login successful', 
    data: result 
  });
});

const VerifyOtpForRegistration = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyOTPForRegistration(req.body.identifier, req.body.otp);
  sendResponse(res, { statusCode: 200, success: true, message: 'Verified', data: result });
});

const resendOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.resendOTP(req.body.identifier);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgotPass(req.body.identifier);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await AuthServices.changePassword(req.user.userId!, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await AuthServices.refreshToken(req.body.refreshToken || req.cookies.refreshToken);
  sendResponse(res, { statusCode: 200, success: true, message: 'Token Refreshed', data: result });
});

const generateQRCode = catchAsync(async (req, res) => {
  const { companyId, teamId } = req.body;
  const result = await AuthServices.generateQRCode(companyId, teamId, req.user.role);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'QR code generated successfully',
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  sendResponse(res, { statusCode: 200, success: true, message: 'Logged out', data: null });
});

export const AuthControllers = {
  registerUser,
  userLogin,
  employeeIdLogin,
  guestLogin,
  qrCodeLogin,
  generateQRCode,
  VerifyOtpForRegistration,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
};