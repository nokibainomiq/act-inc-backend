import { Model, Types } from 'mongoose';

export interface IFeaturedTraining {
  moduleId: Types.ObjectId;
  trainingId?: Types.ObjectId;
  topicId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  customText?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TFeaturedTrainingModel = Model<IFeaturedTraining>;
