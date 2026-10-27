import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import { NotificationServices } from './notification.services';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationServices.getMyNotificationsFromDB(req.user.userId!, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  await NotificationServices.markAllAsReadInDB(req.user.userId!);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const markSingleAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationServices.markSingleAsReadInDB(req.user.userId!, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

// ── Broadcast Notification (Admin) — supports FormData with image upload ──
const broadcastNotification = catchAsync(async (req: Request, res: Response) => {
  // Upload image to Cloudinary if provided
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  // Parse FormData — supports both JSON body and FormData with 'data' field
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const { title, message, target, actionLink } = rawData;

  const result = await NotificationServices.sendBroadcastNotification({
    title,
    message,
    image: imageUrl,
    target,
    actionLink,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: { totalSent: result.totalSent },
  });
});

// ── Broadcast to Company Users ──
const broadcastToCompanies = catchAsync(async (req: Request, res: Response) => {
  const { title, message, targetType, companyId } = req.body;

  const result = await NotificationServices.broadcastToCompanies({
    title,
    message,
    targetType,
    companyId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: { totalSent: result.totalSent },
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAllAsRead,
  markSingleAsRead,
  broadcastNotification,
  broadcastToCompanies,
};