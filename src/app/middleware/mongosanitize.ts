import { Request, Response, NextFunction } from 'express';
import sanitize from 'mongo-sanitize'; 

const mongoSanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.params) {

    sanitize(req.params);
  }
  if (req.query) {

    sanitize(req.query);
  }
  next();
};

export default mongoSanitizeMiddleware;