import { Model } from 'mongoose';

export type TAdminRole = 'admin' | 'superAdmin';

export interface TAdmin {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  image?: string;
  role: TAdminRole;
  status: 'active' | 'blocked';
  isDeleted: boolean;
   otp?: string | null;      
  otpExpires?: Date | null; 
}

export interface IAdminMethods {
  isPasswordMatched(plain: string, hashed: string): Promise<boolean>;
}

export type TAdminModel = Model<TAdmin, Record<string, never>, IAdminMethods>;