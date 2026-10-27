import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { TJwtPayload } from './auth.interface';

export const createToken = (
  jwtPayload: TJwtPayload,
  secret: Secret,
  expiresIn: string,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn } as SignOptions);
};

export const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as TJwtPayload & jwt.JwtPayload;
};