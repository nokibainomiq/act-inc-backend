import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { Team } from '../Team/team.model';
import { createToken, verifyToken } from './auth.utils';
import config from '../../config';
import { getEmailTemplate } from '../../utils/emailTemplate';
import sendEmail from '../../utils/sendEmail';
import QRCode from 'qrcode';
import { TResetPassword, TEmployeeIdLogin, TGuestLogin } from './auth.interface';
import { TUser } from '../User/user.interface';
import { USER_ROLE, AUTH_TYPE } from './auth.constant';



export const sendOtpToUser = async (user: any, plainOtp: string, title: string, _identifier?: string) => {

  // --- Always send OTP via Email (primary channel) ---
  const html = getEmailTemplate({
    userName: user.firstName,
    title,
    body: `Your verification code is below. Please use it within 10 minutes.`,
    otpCode: plainOtp,
    codeLabel: 'Verification Code',
    codeExpiry: 'Valid for the next 10 minutes.',
  });

  await sendEmail({
    to: user.email!,
    subject: title,
    html,
  });
  console.log('✅ OTP sent via Email to:', user.email);
};


// ─────────────────────────────────────────────
//  FLOW 4: Email & Password Registration (Website - Standard)
//  Requires companyId and teamId. Validates team belongs to company.
// ─────────────────────────────────────────────
const registerUser = async (payload: TUser & { companyId: string; teamId: string }) => {
  const { companyId, teamId } = payload;

  // Validate email uniqueness
  const isExist = await User.findOne({ email: payload.email });
  if (isExist) throw new AppError(409, 'Email already registered');

  // Validate company exists and is active (company is now a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  if (company.status !== 'active') throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');

  // Validate team belongs to company
  const team = await Team.findById(teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  if (team.companyId.toString() !== companyId) throw new AppError(httpStatus.BAD_REQUEST, 'Team does not belong to this company');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const userData: Partial<TUser> = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    role: 'user',
    authType: 'email',
    companyId: new Types.ObjectId(companyId),
    teamId: new Types.ObjectId(teamId),
    status: 'active',
    isOtpVerified: false,
    otp: plainOtp,
    otpExpires: new Date(Date.now() + 10 * 60 * 1000),
  };

  const newUser = await User.create(userData);

  // Send OTP via Email
  try {
    const emailHtml = getEmailTemplate({
      userName: payload.firstName,
      title: 'Verify Your Account',
      body: 'Welcome to ActInc! Use the verification code below to activate your account.',
      otpCode: plainOtp,
      codeLabel: 'Verification Code',
      codeExpiry: 'Valid for the next 10 minutes.',
    });
    await sendEmail({
      to: payload.email!,
      subject: 'Your ActInc Verification Code',
      html: emailHtml,
    });
    console.log('✅ OTP sent via Email to:', payload.email);
  } catch (emailError: any) {
    await User.findByIdAndDelete(newUser._id);
    console.error('❌ Email OTP failed:', emailError?.message || emailError);
    throw new AppError(502, 'Failed to send OTP via Email. Please try again.');
  }

  return newUser;
};


const verifyOTPForRegistration = async (identifier: string, otp: string) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  }).select('+otp +otpExpires');

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // Check if OTP is already expired
  if (user.otpExpires && user.otpExpires < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired. Please request a new one via /resendOtp');
  }

  if (!user.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No OTP found. Please request a new one via /resendOtp');
  }

  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');

  user.isOtpVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  // Include companyId for company role so downstream controllers work correctly
  const jwtPayload: Record<string, string> = { userId: user._id.toString(), role: user.role };
  if (user.role === 'company') {
    jwtPayload.companyId = user._id.toString();
  }
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user
  };
};

// ─────────────────────────────────────────────
//  FLOW 1 & 2: Login via email/password
//  Supports: superAdmin, admin, company, user roles
//  For 'company' role — company IS a User, so own status is the company status
// ─────────────────────────────────────────────
const loginUser = async (payload: { identifier: string; password: string; fcmToken?: string }) => {
  const user = await User.findOne({ $or: [{ email: payload.identifier }, { phone: payload.identifier }] }).select('+password');
  if (!user || user.isDeleted || user.status === 'blocked' || user.status === 'inactive' || user.status === 'suspended' || !user.isOtpVerified)
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials or account not verified');

  const isMatch = await user.isPasswordMatched(payload.password, user.password!);
  if (!isMatch) throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password');

  // Company role: status already checked above — company IS a User now (Single-Table Inheritance)
  // No separate Company document lookup needed.

  // Update FCM token
  if (payload.fcmToken) {
    user.fcmToken = payload.fcmToken;
  }

  user.lastActiveAt = new Date();
  await user.save();

  // Include companyId for company role so req.user.companyId works in downstream controllers
  const jwtPayload: Record<string, string> = { userId: user._id.toString(), role: user.role };
  if (user.role === 'company') {
    jwtPayload.companyId = user._id.toString();
  }
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user
  };
};

// ─────────────────────────────────────────────
//  FLOW 3: Employee ID Login (Just-in-Time Registration)
//  If user exists with employeeId in company → login
//  If not → create new user with role:user, authType:employeeId
// ─────────────────────────────────────────────
const employeeIdLogin = async (payload: TEmployeeIdLogin) => {
  const { employeeId, companyId, teamId, firstName, lastName } = payload;

  // Validate team belongs to company
  const team = await Team.findById(teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  if (team.companyId.toString() !== companyId) throw new AppError(httpStatus.BAD_REQUEST, 'Team does not belong to this company');

  // Validate company is active (company is a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  if (company.status !== 'active') throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');

  // Check if user already exists with this employeeId in this company
  let user = await User.findOne({ employeeId, companyId: new Types.ObjectId(companyId) });

  if (!user) {
    // Just-in-time registration: create new user
    // Email lagbe na — unique placeholder email: firstname@companyname.com
    const companySlug = company.firstName.toLowerCase().replace(/\s+/g, '');
    const placeholderEmail = `${firstName.toLowerCase()}@${companySlug}.com`;

    user = await User.create({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: placeholderEmail,
      employeeId,
      role: 'user',
      authType: 'employeeId',
      companyId: new Types.ObjectId(companyId),
      teamId: new Types.ObjectId(teamId),
      status: 'active',
      isOtpVerified: true, // No OTP needed for employee ID flow
      lastActiveAt: new Date(),
    });
    console.log(`✅ JIT user created via employeeId: ${employeeId} in company ${companyId}`);
  } else {
    // Update last active
    user.lastActiveAt = new Date();
    await user.save();
  }

  const jwtPayload = { userId: user._id.toString(), role: user.role, companyId, teamId, authType: 'employeeId' };
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user,
  };
};

// ─────────────────────────────────────────────
//  FLOW 5: Guest Login (Anonymous via Passcode)
//  Verifies passcode against Team model.
//  Issues JWT with role:guest — NO DB record created.
// ─────────────────────────────────────────────
const guestLogin = async (payload: TGuestLogin) => {
  const { passcode, companyId, teamId } = payload;

  // Validate company is active (company is a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  if (company.status !== 'active') throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');

  // Validate team belongs to company
  const team = await Team.findById(teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  if (team.companyId.toString() !== companyId) throw new AppError(httpStatus.BAD_REQUEST, 'Team does not belong to this company');

  // Verify passcode against stored hash
  const isValidPasscode = await Team.isPasscodeValid(teamId, passcode);
  if (!isValidPasscode) throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid passcode');

  // Issue JWT with guest role — no DB record
  const jwtPayload = { role: 'guest', companyId, teamId, authType: 'anonymous' };
  const guestAccessToken = createToken(jwtPayload, config.jwt_access_secret!, config.jwt_guest_access_expires_in || '4h');
  const guestRefreshToken = createToken(jwtPayload, config.jwt_refresh_secret!, '8h');

  return {
    accessToken: guestAccessToken,
    refreshToken: guestRefreshToken,
    user: null, // No user record for guests
    message: 'Guest login successful',
  };
};

// ─────────────────────────────────────────────
//  FLOW 6: QR Code Login/Registration
//  Scans QR code containing encrypted token with companyId, teamId, and optional user data
//  If user exists → login; if not → register new user
// ─────────────────────────────────────────────
const qrCodeLogin = async (payload: {
  qrToken: string;
  guestId?: string;
  userId?: string;
  authToken?: string;
  guestIdHeader?: string;
  cookieGuestId?: string;
  cookieRefreshToken?: string;
  clientIp?: string;
  userAgent?: string;
}) => {
  const {
    qrToken,
    guestId: clientGuestId,
    userId: clientUserId,
    authToken,
    guestIdHeader,
    cookieGuestId,
    cookieRefreshToken,
    clientIp,
    userAgent,
  } = payload;

  // Decode and verify QR token
  let decoded: any;
  try {
    decoded = verifyToken(qrToken, config.jwt_access_secret!);
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired QR code');
  }

  const { companyId, teamId, type } = decoded;

  if (type !== 'qr_login') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid QR code type');
  }

  // Validate company is active (company is a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  if (company.status !== 'active') throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');

  // Validate team belongs to company
  const team = await Team.findById(teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  if (team.companyId.toString() !== companyId) throw new AppError(httpStatus.BAD_REQUEST, 'Team does not belong to this company');

  // Verify QR version — reject if a newer QR was generated for this team
  if (decoded.qrVersion !== undefined && decoded.qrVersion !== team.qrVersion) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'QR code is no longer valid. Please scan a new one.');
  }

  let existingUser: any = null;

  // 1. Check via Cookies (guestId cookie or refreshToken cookie sent automatically by browser)
  const targetCookieGuestId = cookieGuestId || clientGuestId || guestIdHeader;
  if (targetCookieGuestId) {
    existingUser = await User.findOne({ guestId: targetCookieGuestId, isDeleted: false });
  }

  if (!existingUser && cookieRefreshToken) {
    try {
      const decodedRef: any = verifyToken(cookieRefreshToken, config.jwt_refresh_secret!);
      if (decodedRef?.userId) {
        existingUser = await User.findById(decodedRef.userId);
      }
    } catch (e) {
      // Ignored
    }
  }

  // 2. Check via Bearer Auth Token in header
  if (!existingUser && authToken) {
    try {
      const decodedToken: any = verifyToken(authToken, config.jwt_access_secret!);
      if (decodedToken?.userId) {
        existingUser = await User.findById(decodedToken.userId);
      }
    } catch (err) {
      // Ignored if expired/invalid token
    }
  }

  // 3. Check via userId (body)
  if (!existingUser && clientUserId) {
    existingUser = await User.findById(clientUserId);
  }

  // 4. Device Fingerprint fallback (IP + User-Agent + Company + Team)
  if (!existingUser && clientIp && userAgent) {
    const rawFingerprint = `${clientIp}_${userAgent}_${companyId}_${teamId}`;
    const deviceFingerprint = crypto.createHash('md5').update(rawFingerprint).digest('hex');
    const fpGuestId = `qr_fp_${deviceFingerprint.slice(0, 16)}`;

    existingUser = await User.findOne({ guestId: fpGuestId, isDeleted: false });
    if (!existingUser) {
      // Create user with this deterministic fingerprint guestId so future scans from same device log in
      const autoName = `User_${deviceFingerprint.slice(-6)}`;
      const autoEmail = `${fpGuestId}@qr.local`;

      existingUser = await User.create({
        firstName: autoName,
        lastName: deviceFingerprint.slice(-6),
        fullName: autoName,
        email: autoEmail,
        guestId: fpGuestId,
        role: 'user',
        authType: 'qr',
        companyId: new Types.ObjectId(companyId),
        teamId: new Types.ObjectId(teamId),
        status: 'active',
        isOtpVerified: true,
        lastActiveAt: new Date(),
      });

      console.log(`✅ Auto-registered new QR user via Device Fingerprint: ${autoName}`);

      const jwtPayload = {
        userId: existingUser._id.toString(),
        role: 'user',
        companyId,
        teamId,
        authType: 'qr' as const,
      };

      return {
        accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
        refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
        user: existingUser,
        isNewUser: true,
      };
    }
  }

  // ── Existing User Found -> Perform Login ──
  if (existingUser && !existingUser.isDeleted) {
    existingUser.lastActiveAt = new Date();
    existingUser.companyId = new Types.ObjectId(companyId);
    existingUser.teamId = new Types.ObjectId(teamId);
    await existingUser.save();

    console.log(`🔑 Existing QR user logged in: ${existingUser.firstName} (${existingUser._id})`);

    const jwtPayload = {
      userId: existingUser._id.toString(),
      role: 'user',
      companyId,
      teamId,
      authType: 'qr' as const,
    };

    return {
      accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
      refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
      user: existingUser,
      isNewUser: false,
    };
  }

  // ── First Scan: Auto Register new user (zero input required) ──
  const guestId = clientGuestId || `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const autoName = `User_${guestId.slice(-6)}`;
  const autoEmail = `${guestId}@qr.local`; // Unique email to avoid duplicate key on email index

  const user = await User.create({
    firstName: autoName,
    lastName: guestId.slice(-6),
    fullName: autoName,
    email: autoEmail,
    guestId,
    role: 'user',
    authType: 'qr',
    companyId: new Types.ObjectId(companyId),
    teamId: new Types.ObjectId(teamId),
    status: 'active',
    isOtpVerified: true,
    lastActiveAt: new Date(),
  });

  console.log(`✅ Auto-registered new QR user: ${autoName} in company ${company.firstName}`);

  const jwtPayload = { userId: user._id.toString(), role: 'user', companyId, teamId, authType: 'qr' as const };
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user,
    isNewUser: true,
  };
};

// ---------------------------------------

const resendOTP = async (identifier: string) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  }).select('+otp +otpExpires');

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = plainOtp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpToUser(user, plainOtp, "Your New Verification Code", identifier);
  return { message: 'Verification code resent successfully' };
};

const forgotPass = async (identifier: string) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  }).select('+otp +otpExpires');

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = plainOtp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpToUser(user, plainOtp, "Password Reset OTP", identifier);
  return { message: 'Reset OTP sent successfully' };
};


const resetPassword = async (payload: TResetPassword) => {
  const { identifier, otp, newPassword } = payload;


  const user = await User.findOne({
    $or: [{ phone: identifier }, { email: identifier }]
  }).select('+otp +otpExpires');

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');


  if (!user.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No OTP found. Please request a new one via /forgotPass');
  }

  const isOtpMatched = await bcrypt.compare(otp, user.otp);
  if (!isOtpMatched || (user.otpExpires && user.otpExpires < new Date())) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  user.password = newPassword;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  return { message: 'Password reset successful' };
};


// -------------------------------

// const resendOTP = async (phone: string) => {
//   const user = await User.findOne({ phone });
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
//   user.otp = plainOtp;
//   user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//   await user.save();
//   await sendOTP(phone, plainOtp);
//   return { message: 'OTP resent successfully' };
// };


// const forgotPass = async (identifier: string) => {
//   const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
//   user.otp = plainOtp;
//   user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//   await user.save();
//   await sendOTP(user.phone, plainOtp);
//   return { message: 'Reset OTP sent' };
// };


// const resetPassword = async (payload: any) => {
//   const user = await User.findOne({ phone: payload.phone }).select('+otp +otpExpires');
//   const isMatch = await bcrypt.compare(payload.otp, user?.otp || '');
//   if (!user || !isMatch) throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
//   user.password = payload.newPassword;
//   user.otp = null;
//   await user.save();
//   return { message: 'Password reset successful' };
// };


const changePassword = async (userId: string, payload: any) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  if (!user.password) throw new AppError(httpStatus.BAD_REQUEST, 'Password not set');
  const isMatch = await user.isPasswordMatched(payload.oldPassword, user.password);
  if (!isMatch) throw new AppError(httpStatus.FORBIDDEN, 'Old password incorrect');
  user.password = payload.newPassword;
  await user.save();
  return { message: 'Password updated' };
};


const refreshToken = async (token: string) => {
  const decoded = verifyToken(token, config.jwt_refresh_secret!) as any;

  // Guest token refresh — no DB check needed
  if (decoded.role === 'guest') {
    const jwtPayload = { role: 'guest', companyId: decoded.companyId, teamId: decoded.teamId, authType: 'anonymous' };
    return {
      accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_guest_access_expires_in || '4h'),
    };
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.status === 'blocked') throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized');
  const refreshPayload: Record<string, string> = { userId: user._id.toString(), role: user.role };
  if (user.role === 'company') {
    refreshPayload.companyId = user._id.toString();
  }
  return { accessToken: createToken(refreshPayload, config.jwt_access_secret!, '1d') };
};




// ─────────────────────────────────────────────
//  QR CODE GENERATION
//  Company/Admin/SuperAdmin generates QR code for guest login
// ─────────────────────────────────────────────
const generateQRCode = async (companyId: string, teamId: string, role: string) => {
  // Validate company exists and is active (company is a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  if (company.status !== 'active') throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');

  // Validate team belongs to company
  const team = await Team.findById(teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  if (team.companyId.toString() !== companyId) throw new AppError(httpStatus.BAD_REQUEST, 'Team does not belong to this company');

  // Increment qrVersion — old QR tokens for this team will become invalid
  const newVersion = (team.qrVersion || 0) + 1;
  await Team.findByIdAndUpdate(teamId, { qrVersion: newVersion });

  // Generate JWT token for QR code — no expiry, invalidated by qrVersion check
  const qrToken = createToken(
    { companyId, teamId, type: 'qr_login', qrVersion: newVersion },
    config.jwt_access_secret!,
    '365d' // long-lived; actual invalidation is via qrVersion mismatch
  );

  // ── QR code contains FULL URL with companyId + teamId ──
  const frontendUrl = config.frontend_url || 'http://localhost:3000';
  const qrUrl = `${frontendUrl}/qr-login?token=${qrToken}&companyId=${companyId}&teamId=${teamId}`;

  // Generate QR code as data URL (base64 PNG)
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  console.log(`✅ QR code generated for company: ${company.firstName}, team: ${team.name}`);

  return {
    qrToken,
    qrUrl, // Full URL: frontend.com/qr-login?token=xxx&companyId=xxx&teamId=xxx
    qrImage: qrDataUrl, // base64 data URL — frontend e <img src={qrImage}> set korte parbe
    qrVersion: newVersion,
    company: { _id: company._id, name: company.firstName },
    team: { _id: team._id, name: team.name },
  };
};

export const AuthServices = {
  registerUser,
  verifyOTPForRegistration,
  loginUser,
  employeeIdLogin,
  guestLogin,
  qrCodeLogin,
  generateQRCode,
  resendOTP,
  forgotPass,
  resetPassword,
  changePassword,
  refreshToken,
  sendOtpToUser,
};