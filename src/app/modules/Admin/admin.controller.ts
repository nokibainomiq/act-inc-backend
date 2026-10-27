import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminServices } from './admin.services';
import uploadImage from '../../middleware/upload';
import config from '../../config';

const loginAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.loginAdminFromDB(req.body);
  const { refreshToken, accessToken, admin } = result;

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin logged in successfully',
    data: { accessToken, admin },
  });
});

const updateProfile = catchAsync(async (req, res) => {
  let imageUrl;
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, image: imageUrl };

  const result = await AdminServices.updateAdminProfile(req.user.userId!, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin profile updated',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await AdminServices.changeAdminPassword(req.user.userId!, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AdminServices.forgotPassword(req.body.identifier);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AdminServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const createAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.createAdminInDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'New Admin created successfully',
    data: result,
  });
});
const resendOtp = catchAsync(async (req, res) => {
  const result = await AdminServices.resendOTP(req.body.identifier);
  sendResponse(res, { statusCode: 200, success: true, message: result.message, data: null });
});

const blockUnblockUser = catchAsync(async (req, res) => {
  const result = await AdminServices.blockUnblockUser(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.user,
  });
});

const deleteAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.deleteAdminFromDB(req.params.id as string, req.user.userId!);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const blockUnblockAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.blockUnblockAdmin(req.params.id as string, req.user.userId!);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.admin,
  });
});

const getAllAdmins = catchAsync(async (req, res) => {
  const result = await AdminServices.getAllAdminsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All admins retrieved successfully',
    data: result,
  });
});
export const AdminControllers = {
  loginAdmin,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  createAdmin,
  resendOtp,
  blockUnblockUser,
  deleteAdmin,
  blockUnblockAdmin,
  getAllAdmins,
};