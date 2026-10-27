export const USER_ROLE = {
  superAdmin: 'superAdmin',
  admin: 'admin',
  company: 'company',
  user: 'user',
  guest: 'guest',
} as const;

export const AUTH_TYPE = {
  email: 'email',
  employeeId: 'employeeId',
  anonymous: 'anonymous',
} as const;

export const USER_STATUS = {
  pending: 'pending',
  active: 'active',
  blocked: 'blocked',
} as const;