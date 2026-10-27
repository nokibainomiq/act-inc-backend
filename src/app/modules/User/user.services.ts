import httpStatus from 'http-status'
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Admin } from '../Admin/admin.model';
import { User } from './user.model';
import QueryBuilder from '../../builder/QueryBuilder';

const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find({ isDeleted: false }), query)
    .search(['firstName', 'lastName', 'email', 'phone', 'employeeId'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

const updateProfileInDB = async (
  userId?: string,
  payload: any = {},
  role?: string,
  companyId?: string,
  teamId?: string,
) => {
  // Strip restricted fields
  delete payload.role;
  delete payload.password;
  delete payload.email;
  delete payload.isOtpVerified;
  delete payload.isDeleted;
  delete payload.authType;

  payload.lastActiveAt = new Date();

  if (userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'User not found');
    return await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
  }

  // Handle guest users who don't have a DB record yet
  if (role === 'guest') {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const autoEmail = `${guestId}@guest.local`;

    const newGuestUser = await User.create({
      firstName: payload.firstName || 'Guest',
      lastName: payload.lastName || 'User',
      fullName: payload.fullName || `${payload.firstName || 'Guest'} ${payload.lastName || 'User'}`.trim(),
      image: payload.image || '',
      phone: payload.phone || '',
      email: autoEmail,
      guestId,
      role: 'guest',
      authType: 'anonymous',
      companyId: companyId ? new Types.ObjectId(companyId) : undefined,
      teamId: teamId ? new Types.ObjectId(teamId) : undefined,
      status: 'active',
      isOtpVerified: true,
      lastActiveAt: new Date(),
    });

    return newGuestUser;
  }

  throw new AppError(400, 'User ID is required to update profile');
};

const defaultBranding = {
  logo: '',
  primaryColor: '#8ACDDE',
  secondaryColor: '#E9308F',
  videoTitle: '',
  videoDescription: '',
  presenterName: '',
  presenterDesignation: '',
  videoUrl: '',
};

const getMeFromDB = async (
  userId?: string,
  role?: string,
  companyId?: string,
  teamId?: string,
) => {
  let result: any = null;
  if (role === 'admin' || role === 'superAdmin') {
    result = await Admin.findById(userId);
    return result;
  }

  if (userId) {
    result = await User.findById(userId);
  }

  // Handle guest users who don't have a DB User record
  if (!result && role === 'guest') {
    const guestObj: any = {
      _id: 'guest',
      firstName: 'Guest',
      lastName: 'User',
      fullName: 'Guest User',
      role: 'guest',
      companyId: companyId || null,
      teamId: teamId || null,
      authType: 'anonymous',
    };

    if (companyId) {
      const company = await User.findById(companyId).select('branding');
      const compBranding: any = company?.branding || {};
      guestObj.branding = {
        logo: compBranding.logo || defaultBranding.logo,
        primaryColor: compBranding.primaryColor || defaultBranding.primaryColor,
        secondaryColor: compBranding.secondaryColor || defaultBranding.secondaryColor,
        videoTitle: compBranding.videoTitle || defaultBranding.videoTitle,
        videoDescription: compBranding.videoDescription || defaultBranding.videoDescription,
        presenterName: compBranding.presenterName || defaultBranding.presenterName,
        presenterDesignation: compBranding.presenterDesignation || defaultBranding.presenterDesignation,
        videoUrl: compBranding.videoUrl || defaultBranding.videoUrl,
      };
    } else {
      guestObj.branding = defaultBranding;
    }

    return guestObj;
  }

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile not found!');
  }

  const userObj = result.toObject ? result.toObject() : { ...result };

  // If regular user or guest assigned to a company, fetch that company's branding
  if ((role === 'user' || role === 'guest') && result.companyId) {
    const company = await User.findById(result.companyId).select('branding');
    const compBranding: any = company?.branding || {};

    userObj.branding = {
      logo: compBranding.logo || defaultBranding.logo,
      primaryColor: compBranding.primaryColor || defaultBranding.primaryColor,
      secondaryColor: compBranding.secondaryColor || defaultBranding.secondaryColor,
      videoTitle: compBranding.videoTitle || defaultBranding.videoTitle,
      videoDescription: compBranding.videoDescription || defaultBranding.videoDescription,
      presenterName: compBranding.presenterName || defaultBranding.presenterName,
      presenterDesignation: compBranding.presenterDesignation || defaultBranding.presenterDesignation,
      videoUrl: compBranding.videoUrl || defaultBranding.videoUrl,
    };
  } else if (role === 'company') {
    const compBranding: any = result.branding || {};
    userObj.branding = {
      logo: compBranding.logo || defaultBranding.logo,
      primaryColor: compBranding.primaryColor || defaultBranding.primaryColor,
      secondaryColor: compBranding.secondaryColor || defaultBranding.secondaryColor,
      videoTitle: compBranding.videoTitle || defaultBranding.videoTitle,
      videoDescription: compBranding.videoDescription || defaultBranding.videoDescription,
      presenterName: compBranding.presenterName || defaultBranding.presenterName,
      presenterDesignation: compBranding.presenterDesignation || defaultBranding.presenterDesignation,
      videoUrl: compBranding.videoUrl || defaultBranding.videoUrl,
    };
  }

  return userObj;
};

const getUsersByCompany = async (companyId: string, query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(
    User.find({ companyId, role: 'user', isDeleted: false }).select('-password -otp -otpExpires'),
    query,
  )
    .search(['firstName', 'lastName', 'email', 'phone', 'employeeId'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

export const UserServices = {
  getAllUsersFromDB,
  updateProfileInDB,
  getMeFromDB,
  getUsersByCompany,
};