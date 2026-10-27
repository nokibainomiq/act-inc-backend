import { Model, Types } from 'mongoose';

export interface ITrainingInvite {
  token: string;
  trainingId: Types.ObjectId;
  companyId?: Types.ObjectId;
  email?: string;
  expiresAt: Date;
  isUsed: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TTrainingInviteModel = Model<ITrainingInvite>;
