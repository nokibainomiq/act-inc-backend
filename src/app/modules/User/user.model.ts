import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import config from "../../config";
import { IUserMethods, TUser, TCompanyBranding, UserModel } from "./user.interface";

const brandingSubSchema = new Schema<TCompanyBranding>(
  {
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#E9308F' },
    secondaryColor: { type: String, default: '#8ACDDE' },
    videoTitle: { type: String, default: '' },
    videoDescription: { type: String, default: '' },
    presenterName: { type: String, default: '' },
    presenterDesignation: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
  },
  { _id: false },
);

const userSchema = new Schema<TUser, UserModel, IUserMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    fullName: { type: String },
    image: { type: String, default: "" },
    email: { type: String, sparse: true, unique: true },
    phone: { type: String, sparse: true},
    password: { type: String, select: 0 },
    authType: {
      type: String,
      enum: ["email", "employeeId", "anonymous", "qr", "passcode", "guest"],
      default: "email",
    },
    role: {
      type: String,
      enum: ["user", "admin", "superAdmin", "company", "guest"],
      default: "user",
    },
    employeeId: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: 'User' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ["active", "blocked", "inactive", "suspended"],
      default: "active",
    },
    // Company-specific fields (only used when role === 'company')
    slug: { type: String, sparse: true, unique: true },
    address: { type: String, default: '' },
    branding: { type: brandingSubSchema, default: () => ({}) },
    isOtpVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    otp: { type: String, select: 0 },
    otpExpires: { type: Date, select: 0 },
    acceptedTerms: { type: Boolean },
    guestId: { type: String, sparse: true, unique: true }, // QR login: auto-generated, frontend localStorage e store hoy
    fcmToken: { type: String, default: null },
    passwordChangedAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

// Pre-save hook
userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(
      this.password as string,
      Number(config.bcrypt_salt_rounds),
    );
  }
  if (this.isModified("otp") && this.otp) {
    this.otp = await bcrypt.hash(
      this.otp as string,
      Number(config.bcrypt_salt_rounds),
    );
  }
  this.fullName = this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

// Instance Method
userSchema.methods.isPasswordMatched = async function (plain, hashed) {
  return await bcrypt.compare(plain, hashed);
};

// Static Methods
userSchema.statics.isUserExistsById = async function (id: string) {
  return await this.findById(id).select("+password");
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<TUser, UserModel>("User", userSchema);
