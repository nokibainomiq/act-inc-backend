import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & {
        userId?: string;
        role: string;
        companyId?: string;
        teamId?: string;
        authType?: string;
      };
    }
  }
}
