import { Schema, model } from 'mongoose';

const servicePackageSchema = new Schema({
  vendor: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const ServicePackage = model('ServicePackage', servicePackageSchema);
