import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import catchAsync from '../utils/catchAsync';
import { verifyToken } from '../modules/Auth/auth.utils';
import { User } from '../modules/User/user.model';
import { Admin } from '../modules/Admin/admin.model';

// Allowed roles for auth guard
export type TAuthRole = 'superAdmin' | 'admin' | 'company' | 'user' | 'guest';

const auth = (...requiredRoles: TAuthRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    const decoded = verifyToken(token, config.jwt_access_secret as Secret) as JwtPayload & {
      userId?: string;
      role: string;
      companyId?: string;
      teamId?: string;
      authType?: string;
    };
    const { role, userId } = decoded;

    // ── Guest role: no DB record, verify JWT only ──
    if (role === 'guest') {
      if (requiredRoles.length && !requiredRoles.includes('guest')) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }
      req.user = decoded;
      return next();
    }

    // ── For all other roles, verify the user exists in DB ──
    if (!userId) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token: userId missing');
    }

    let user = null;

    if (role === 'admin' || role === 'superAdmin') {
      user = await Admin.findById(userId);
    } else {
      user = await User.isUserExistsById(userId);
    }

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
    }

    if (user.status === 'blocked') {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
    }

    // Company users with 'inactive' or 'suspended' status cannot access the system
    if ((user as any).status === 'inactive' || (user as any).status === 'suspended') {
      throw new AppError(httpStatus.FORBIDDEN, 'This account is not active. Contact support.');
    }

    // Check if JWT was issued before password change
    if (
      role !== 'admin' && role !== 'superAdmin' &&
      (user as any).passwordChangedAt &&
      User.isJWTIssuedBeforePasswordChanged((user as any).passwordChangedAt, decoded.iat as number)
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    if (requiredRoles.length && !requiredRoles.includes(role as TAuthRole)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    // Update last active timestamp (fire-and-forget)
    if (role !== 'admin' && role !== 'superAdmin') {
      User.findByIdAndUpdate(userId, { lastActiveAt: new Date() }).catch(() => {});
    }

    req.user = decoded;
    next();
  });
};

export default auth;