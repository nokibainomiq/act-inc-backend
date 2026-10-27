import { Schema, model } from 'mongoose';
import { ITrainingInvite, TTrainingInviteModel } from './trainingInvite.interface';

const trainingInviteSchema = new Schema<ITrainingInvite, TTrainingInviteModel>(
  {
    token: { type: String, required: true, unique: true, index: true },
    trainingId: { type: Schema.Types.ObjectId, ref: 'Training', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

trainingInviteSchema.index({ expiresAt: 1 });

export const TrainingInvite = model<ITrainingInvite, TTrainingInviteModel>(
  'TrainingInvite',
  trainingInviteSchema,
);
