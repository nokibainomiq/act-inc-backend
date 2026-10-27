import { NotificationModel } from '../modules/Notification/notification.model';
import { User } from '../modules/User/user.model';

/**
 * Send a notification — persists to DB and logs push (FCM removed).
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn(`⚠️ User not found for notification: ${userId}`);
      return;
    }

    // Persist notification to DB
    await NotificationModel.create({
      user: userId,
      title,
      message,
      type: type as any,
      data,
    });

    // Push notification disabled — replace with console.log
    console.log(`📨 [sendNotification] DB saved | user=${userId} title="${title}"`);
    if ((user as any).fcmToken) {
      console.log(`📲 [FCM disabled] Would send push to user ${userId} — fcmToken present but Firebase removed`);
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
};

/**
 * Send notification to all admin / superAdmin users.
 */
/**
 * Send notification to multiple users (bulk).
 */
export const sendNotificationToMultipleUsers = async (
  userIds: string[],
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    if (userIds.length === 0) return;
    const notificationPromises = userIds.map((userId) =>
      sendNotification(userId, title, message, type, data)
    );
    await Promise.all(notificationPromises);
    console.log(`🚀 Bulk notifications sent to ${userIds.length} users.`);
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
  }
};

export const sendNotificationToAdmins = async (
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'superAdmin'] },
      status: 'active',
      isDeleted: false,
    });

    if (admins.length > 0) {
      const notificationPromises = admins.map((admin) =>
        sendNotification(admin._id.toString(), title, message, type, data)
      );
      await Promise.all(notificationPromises);
      console.log(`🚀 Bulk notifications sent to ${admins.length} admins.`);
    }
  } catch (error) {
    console.error('❌ Error sending notification to admins:', error);
  }
};