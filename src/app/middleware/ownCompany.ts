import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';

// A company account may only reach its own company's data; admins can reach any company.
const ownCompany =
  (param = 'id') =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === 'company' && req.params[param] !== req.user.userId) {
      return next(new AppError(httpStatus.FORBIDDEN, 'You can only access your own company'));
    }
    next();
  };

export default ownCompany;
