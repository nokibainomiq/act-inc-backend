import { Schema, model } from 'mongoose';
import { IFeaturedTraining, TFeaturedTrainingModel } from './featuredTraining.interface';

const featuredTrainingSchema = new Schema<IFeaturedTraining, TFeaturedTrainingModel>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    trainingId: { type: Schema.Types.ObjectId, ref: 'Training' },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
    companyId: { type: Schema.Types.ObjectId, ref: 'User' },
    customText: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const FeaturedTraining = model<IFeaturedTraining, TFeaturedTrainingModel>('FeaturedTraining', featuredTrainingSchema);
