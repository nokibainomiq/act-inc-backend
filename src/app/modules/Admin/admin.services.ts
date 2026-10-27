import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import { Admin } from './admin.model';
import { User } from '../User/user.model'; 
import QueryBuilder from '../../builder/QueryBuilder';
import { getEmailTemplate } from '../../utils/emailTemplate';
import sendEmail from '../../utils/sendEmail';
import config from '../../config';
import { createToken } from '../Auth/auth.utils';
import { sendOtpToUser } from '../Auth/auth.services';
import { sendNotification } from '../../utils/sendNotification';


const sendOtpToAdmin = async (admin: any, plainOtp: string, title: string) => {
  // --- Always send OTP via Email (primary channel) ---
  if (admin.email) {
    const html = getEmailTemplate({
      userName: admin.firstName,
      title: title,
      body: `Your verification code is below. Please use it within 10 minutes.`,
      otpCode: plainOtp,
      codeLabel: 'Verification Code',
      codeExpiry: 'Valid for the next 10 minutes.',
    });
    await sendEmail({
      to: admin.email,
      subject: title,
      html: html
    });
    console.log("✅ OTP sent via Email to:", admin.email);
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, "Admin email is required for OTP");
  }
};


const loginAdminFromDB = async (payload: { identifier: string; password: string }) => {
  const { identifier, password } = payload;
  const admin = await Admin.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
  }).select('+password');

  if (!admin || admin.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin account not found');
  }
  if (admin.status === 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is blocked by Super Admin');
  }

  const isMatched = await admin.isPasswordMatched(password, admin.password!);
  if (!isMatched) {
    throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password');
  }

  const jwtPayload = { userId: admin._id.toString(), role: admin.role };
  const accessToken = createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!);

  return { accessToken, refreshToken, admin };
};


const createAdminInDB = async (payload: any) => {
  const isExist = await Admin.findOne({ $or: [{ email: payload.email }, { phone: payload.phone }] });
  if (isExist) throw new AppError(httpStatus.CONFLICT, 'Email or Phone already registered as Admin');
  // Force role to 'admin' — superAdmin cannot be created via API
  payload.role = 'admin';
  return await Admin.create(payload);
};



const updateAdminProfile = async (id: string, payload: any) => {
  // Strip sensitive fields — no admin can change their role, status, or delete themselves via profile update
  delete payload.role;
  delete payload.isDeleted;
  delete payload.email;
  delete payload.password;
  const result = await Admin.findByIdAndUpdate(id, payload, { new: true });
  return result;
};


const changeAdminPassword = async (id: string, payload: any) => {
  const admin = await Admin.findById(id).select('+password');
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');
  const isMatched = await admin.isPasswordMatched(payload.oldPassword, admin.password!);
  if (!isMatched) throw new AppError(httpStatus.FORBIDDEN, 'Old password incorrect');

  admin.password = payload.newPassword;
  await admin.save();
  return { message: 'Password updated successfully' };
};


const forgotPassword = async (identifier: string) => {
  const admin = await Admin.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin account not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  admin.otp = plainOtp;
  admin.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();

  await sendOtpToAdmin(admin, plainOtp, "Admin Password Reset OTP");
  return { message: 'OTP sent successfully' };
};


const resetPassword = async (payload: any) => {
  const admin = await Admin.findOne({ $or: [{ email: payload.identifier }, { phone: payload.identifier }] }).select('+otp +otpExpires');
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');

  if (!admin.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No OTP found. Please request a new one');
  }

  const isOtpMatched = await bcrypt.compare(payload.otp, admin.otp);
  if (!isOtpMatched || (admin.otpExpires && admin.otpExpires < new Date())) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  admin.password = payload.newPassword;
  admin.otp = null;
  admin.otpExpires = null;
  await admin.save();
  return { message: 'Password reset successful' };
};
const resendOTP = async (identifier: string) => {
  const admin = await Admin.findOne({ 
    $or: [{ email: identifier }, { phone: identifier }] 
  }).select('+otp +otpExpires');
  
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  admin.otp = plainOtp; 
  admin.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();

  await sendOtpToAdmin(admin, plainOtp, "Your New Verification Code");
  return { message: 'Verification code resent successfully' };
};
const getMeFromDB = async (userId: string, role: string) => {
  let result = null;

  if (role === 'admin' || role === 'superAdmin') {
    result = await Admin.findById(userId);
  } else {

    result = await User.findById(userId);
  }

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin profile not found!');
  }

  return result;
};
const blockUnblockUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
  user.status = newStatus;
  await user.save();

  return { message: `User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`, user };
};

const deleteAdminFromDB = async (id: string, requesterId: string) => {
  if (id === requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot delete yourself');
  }

  const admin = await Admin.findById(id);
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');
  if (admin.role === 'superAdmin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete a Super Admin');
  }

  admin.isDeleted = true;
  admin.status = 'blocked';
  await admin.save();

  return { message: 'Admin deleted successfully' };
};

const blockUnblockAdmin = async (id: string, requesterId: string) => {
  if (id === requesterId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot block/unblock yourself');
  }

  const admin = await Admin.findById(id);
  if (!admin) throw new AppError(httpStatus.NOT_FOUND, 'Admin not found');
  if (admin.role === 'superAdmin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot block/unblock a Super Admin');
  }

  const newStatus = admin.status === 'blocked' ? 'active' : 'blocked';
  admin.status = newStatus;
  await admin.save();

  return { message: `Admin ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`, admin };
};

const getAllAdminsFromDB = async (query: Record<string, unknown>) => {
  const adminQuery = new QueryBuilder(
    Admin.find({ isDeleted: false }),
    query,
  )
    .search(['email', 'firstName', 'lastName', 'phone'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await adminQuery.modelQuery;
  const meta = await adminQuery.countTotal();
  return { meta, result };
};

export const AdminServices = { 
  loginAdminFromDB, 
  createAdminInDB, 
  getAllAdminsFromDB,
  updateAdminProfile, 
  changeAdminPassword, 
  forgotPassword, 
  resetPassword ,resendOTP,getMeFromDB,
  blockUnblockUser,
  deleteAdminFromDB,
  blockUnblockAdmin,
};