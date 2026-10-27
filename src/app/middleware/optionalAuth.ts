import { Request, Response, NextFunction } from 'express';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';
import { verifyToken } from '../modules/Auth/auth.utils';

/**
 * Optional authentication middleware.
 * If a valid token is provided, sets req.user.
 * If no token or invalid token, silently continues without setting req.user.
 */
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token, config.jwt_access_secret as Secret) as JwtPayload;
      (req as any).user = decoded;
    } catch {
      // Token invalid or expired — silently continue
    }
  }
  next();
};

export default optionalAuth;
