import { Schema, model } from 'mongoose';

const promotionSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  endDate: { type: Date },
}, { timestamps: true });

export const VendorPromotion = model('VendorPromotion', promotionSchema);
