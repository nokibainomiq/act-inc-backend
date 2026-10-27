import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import config from '../../config';
import { IAdminMethods, TAdmin, TAdminModel } from './admin.interface';

const adminSchema = new Schema<TAdmin, TAdminModel, IAdminMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: 0 },
    image: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'superAdmin'], default: 'admin' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
 otp: { type: String, select: 0 },     
    otpExpires: { type: Date, select: 0 },
  },
  { timestamps: true }
);

// Pre-save hook for Hashing Password & OTP
adminSchema.pre('save', async function () {
  const saltRounds = Number(config.bcrypt_salt_rounds);

  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password as string, saltRounds);
  }
 
  if (this.isModified('otp') && this.otp) {
    this.otp = await bcrypt.hash(this.otp as string, saltRounds);
  }
  this.fullName = `${this.firstName} ${this.lastName}`;
});

adminSchema.methods.isPasswordMatched = async function (plain, hashed) {
  return await bcrypt.compare(plain, hashed);
};

export const Admin = model<TAdmin, TAdminModel>('Admin', adminSchema);