import { Schema, model, Types } from 'mongoose';

const adminActivitySchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., "banned user", "deleted wave"
  targetUser: { type: String }, // e.g., "@harsh_r"
  time: { type: Date, default: Date.now }
});

export const AdminActivityModel = model('AdminActivity', adminActivitySchema);