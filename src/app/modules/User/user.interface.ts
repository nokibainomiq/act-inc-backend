import { Model, Types } from 'mongoose';

export type TUserRole = 'user' | 'admin' | 'superAdmin' | 'company' | 'guest';

export type TAuthType = 'email' | 'employeeId' | 'anonymous' | 'qr' | 'passcode' | 'guest';

/** Company-only status — broader than the generic user status */
export type TCompanyStatus = 'active' | 'inactive' | 'suspended';

/** Branding fields (used by role: 'company' users) */
export interface TCompanyBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  videoTitle: string;
  videoDescription: string;
  presenterName: string;
  presenterDesignation: string;
  videoUrl: string;
}

export interface TUser {
  firstName: string;
  lastName?: string;
  fullName?: string;
  image?: string;
  email?: string;
  phone?: string;
  password?: string;
  authType: TAuthType;
  role: TUserRole;
  employeeId?: string;
  companyId?: Types.ObjectId;
  teamId?: Types.ObjectId;
  status: 'active' | 'blocked' | 'inactive' | 'suspended';
  /** Company-specific fields (only meaningful when role === 'company') */
  slug?: string;
  address?: string;
  branding?: TCompanyBranding;
  isOtpVerified: boolean;
  isDeleted: boolean;
  otp?: string | null;
  otpExpires?: Date | null;
  acceptedTerms?: boolean;
  guestId?: string; // QR login: auto-generated, stored in frontend localStorage
  fcmToken?: string | null;
  passwordChangedAt?: Date;
  lastActiveAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserMethods {
  isPasswordMatched(plain: string, hashed: string): Promise<boolean>;
}


export interface UserModel extends Model<TUser, Record<string, never>, IUserMethods> {
  isUserExistsById(id: string): Promise<TUser>;
  isJWTIssuedBeforePasswordChanged(passwordChangedAt: Date, jwtIssuedTimestamp: number): boolean;
}