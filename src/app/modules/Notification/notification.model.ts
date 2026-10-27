import { Schema, model, Types } from 'mongoose';

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['general', 'broadcast'], 
    default: 'general' 
  },
  isRead: { type: Boolean, default: false },
  /** Optional structured payload for deep-linking and client logic */
  data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const NotificationModel = model('Notification', notificationSchema);