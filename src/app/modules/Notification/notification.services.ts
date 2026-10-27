import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { NotificationModel } from './notification.model';
import { User } from '../User/user.model';
import { sendNotification } from '../../utils/sendNotification';

const BATCH_SIZE = 50; // send 50 notifications per chunk

const getMyNotificationsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const notificationQuery = new QueryBuilder(
    NotificationModel.find({ user: userId }), 
    query
  )
    .sort() 
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  return { meta, result };
};


const markAllAsReadInDB = async (userId: string) => {
  return await NotificationModel.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};


const markSingleAsReadInDB = async (userId: string, notificationId: string) => {
  const notification = await NotificationModel.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new AppError(httpStatus.NOT_FOUND, "Notification not found!");

  return await NotificationModel.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
};

// ── Broadcast Notification (Admin) ──
interface BroadcastPayload {
  title: string;
  message: string;
  image?: string;
  target: 'all' | 'users' | 'company';
  actionLink?: string;
}

const sendBroadcastNotification = async (payload: BroadcastPayload) => {
  const { title, message, target } = payload;

  // Build query based on target
  const filter: Record<string, unknown> = {
    status: 'active',
    isDeleted: false,
  };

  if (target === 'users') {
    filter.role = 'user';
  } else if (target === 'company') {
    filter.role = 'company';
  }
  // target === 'all' → no role filter (includes users, company, admins etc.)

  const totalUsers = await User.countDocuments(filter);
  if (totalUsers === 0) {
    return { message: 'No active users found for the selected target.', totalSent: 0 };
  }

  // Stream users in batches to avoid memory overload
  let sentCount = 0;
  let skip = 0;

  while (skip < totalUsers) {
    const batch = await User.find(filter)
      .select('_id')
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    const userIds = batch.map((u) => u._id.toString());
    const data: Record<string, string> = {};
    if (payload.actionLink) data.actionLink = payload.actionLink;
    if (payload.image) data.image = payload.image;

    await Promise.all(
      userIds.map((id) =>
        sendNotification(id, title, message, 'general', data),
      ),
    );

    sentCount += userIds.length;
    skip += BATCH_SIZE;
  }

  return { message: `Broadcast sent to ${sentCount} users.`, totalSent: sentCount };
};

// ── Broadcast to Company Users (DB-persistent, no sockets) ──
interface BroadcastToCompaniesPayload {
  title: string;
  message: string;
  targetType: 'global' | 'targeted';
  companyId?: string;
}

const broadcastToCompanies = async (payload: BroadcastToCompaniesPayload) => {
  const { title, message, targetType, companyId } = payload;

  // Build filter: only active company users
  const filter: Record<string, unknown> = {
    role: 'company',
    status: 'active',
    isDeleted: false,
  };

  if (targetType === 'targeted') {
    if (!companyId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'companyId is required for targeted broadcast');
    }
    filter.companyId = companyId;
  }

  // Fetch all matching company users
  const users = await User.find(filter).select('_id').lean();

  if (users.length === 0) {
    return { message: 'No active company users found.', totalSent: 0 };
  }

  // Build notification documents for insertMany
  const notifications = users.map((u) => ({
    user: u._id,
    title,
    message,
    type: 'broadcast' as const,
    isRead: false,
    data: {},
  }));

  await NotificationModel.insertMany(notifications, { ordered: false });

  return {
    message: `Broadcast sent to ${users.length} company user(s).`,
    totalSent: users.length,
  };
};

export const NotificationServices = {
  getMyNotificationsFromDB,
  markAllAsReadInDB,
  markSingleAsReadInDB,
  sendBroadcastNotification,
  broadcastToCompanies,
};