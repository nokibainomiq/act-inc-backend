import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { IFeaturedTraining } from './featuredTraining.interface';
import { FeaturedTraining } from './featuredTraining.model';
import { Topic, Training } from '../Training/training.model';

const createFeaturedTraining = async (payload: IFeaturedTraining) => {
  // Find the topic that contains this moduleId
  const topic = await Topic.findOne({ moduleIds: payload.moduleId });
  
  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module or its associated Topic/Training not found!');
  }

  // Auto-fill trainingId and topicId
  payload.topicId = topic._id;
  payload.trainingId = topic.trainingId;

  // Auto-fill companyId from Training if it exists and wasn't provided by the user
  const training = await Training.findById(topic.trainingId);
  if (training && training.companyId && !payload.companyId) {
    payload.companyId = training.companyId;
  }

  // Create new featured module
  const result = await FeaturedTraining.create(payload);
  return result;
};

const getCompanyFeaturedTrainings = async (companyId?: string, role?: string) => {
  const query: any = { isActive: true, isDeleted: false };
  
  // If the user is an admin or superAdmin, they can see all featured trainings
  if (role === 'admin' || role === 'superAdmin') {
    // No companyId filter
  } else if (companyId) {
    query.$or = [{ companyId }, { companyId: { $exists: false } }];
  } else {
    query.companyId = { $exists: false };
  }

  const result = await FeaturedTraining.find(query)
    .populate('trainingId')
    .populate('topicId')
    .populate('moduleId')
    .sort({ createdAt: -1 });
  
  return result;
};

const deleteFeaturedTraining = async (id: string, companyId?: string) => {
  const query: any = { _id: id };
  if (companyId) {
    query.companyId = companyId;
  }
  const featuredTraining = await FeaturedTraining.findOne(query);
  if (!featuredTraining) {
    throw new AppError(httpStatus.NOT_FOUND, 'Featured training not found!');
  }

  const result = await FeaturedTraining.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true }
  );
  return result;
};

export const FeaturedTrainingServices = {
  createFeaturedTraining,
  getCompanyFeaturedTrainings,
  deleteFeaturedTraining,
};
