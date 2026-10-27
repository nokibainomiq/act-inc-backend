import { Response } from 'express';

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  const payload: Record<string, unknown> = {
    success: data.success,
    message: data.message,
    statusCode: data.statusCode,
    data: data.data,
  };

  if (data.meta) {
    payload.meta = data.meta;
  }

  res.status(data?.statusCode).json(payload);
};

export default sendResponse;