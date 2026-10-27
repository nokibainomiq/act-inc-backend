import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { upload } from '../../middleware/multer';
import { USER_ROLE } from '../Auth/auth.constant';
import { NotificationControllers } from './notification.controller';
import { NotificationValidation } from './notification.validation';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;


router.get(
  '/', 
  auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin), 
  NotificationControllers.getMyNotifications
);

 //(Mark All as Read)
router.patch(
  '/mark-all-read',
   auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markAllAsRead
);


router.patch(
  '/mark-read/:id',
   auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markSingleAsRead
);

// ── Admin: Broadcast Notification (FormData with image upload) ──
router.post(
  '/admin/broadcast',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  uploadImage,
  NotificationControllers.broadcastNotification,
);

// ── Admin: Broadcast to Company Users ──
router.post(
  '/broadcast-to-companies',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(NotificationValidation.broadcastToCompaniesSchema),
  NotificationControllers.broadcastToCompanies,
);

export const NotificationRoutes = router;