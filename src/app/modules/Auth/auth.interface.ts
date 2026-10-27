export type TLoginUser = {
  identifier: string; // Email or Phone
  password: string;
};

export type TVerifyOtp = {
  phone: string;
  otp: string;
};

export type TForgetPassword = {
  phone: string;
};

export type TResetPassword = {
  identifier: string;
  otp: string;
  newPassword: string;
};

export type TEmployeeIdLogin = {
  employeeId: string;
  companyId: string;
  teamId: string;
  firstName: string;
  lastName: string;
};

export type TGuestLogin = {
  passcode: string;
  companyId: string;
  teamId: string;
};

export type TQrCodeLogin = {
  qrToken: string; // The QR code token/data
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export type TRegisterUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyId: string;
  teamId: string;
};

export type TJwtPayload = {
  userId?: string;
  role?: string;
  companyId?: string;
  teamId?: string;
  authType?: string;
  type?: string;
  qrVersion?: number;
};