import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TrainingServices } from './training.services';
import uploadImage from '../../middleware/upload';

// ── Create Training ──
const createTraining = catchAsync(async (req, res) => {
  let thumbnailUrl: string | undefined;
  if (req.file) {
    thumbnailUrl = await uploadImage(req);
  }

  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, ...(thumbnailUrl && { thumbnailImage: thumbnailUrl }) };

  const result = await TrainingServices.createTrainingInDB(payload, req.user.userId!);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Training created successfully',
    data: result,
  });
});

// ── Get All Trainings ──
const getAllTrainings = catchAsync(async (req, res) => {
  const result = await TrainingServices.getAllTrainingsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Trainings retrieved successfully',
    data: result.result,
    meta: result.meta,
  });
});

// ── Get Single Training (nested) ──
const getSingleTraining = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await TrainingServices.getSingleTrainingFromDB(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training retrieved successfully',
    data: result,
  });
});

// ── Update Training ──
const updateTraining = catchAsync(async (req, res) => {
  let thumbnailUrl: string | undefined;
  if (req.file) {
    thumbnailUrl = await uploadImage(req);
  }

  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, ...(thumbnailUrl && { thumbnailImage: thumbnailUrl }) };

  const result = await TrainingServices.updateTrainingInDB(
    req.params.id as string,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training updated successfully',
    data: result,
  });
});

// ── Delete Training ──
const deleteTraining = catchAsync(async (req, res) => {
  await TrainingServices.deleteTrainingFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training deleted successfully',
    data: null,
  });
});

// ── Duplicate Training ──
const duplicateTraining = catchAsync(async (req, res) => {
  const result = await TrainingServices.duplicateTrainingInDB(
    req.params.id as string,
    req.body.newTitle,
    req.user.userId!
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Training duplicated successfully',
    data: result,
  });
});

// ── Assign Training to Company ──
const assignTraining = catchAsync(async (req, res) => {
  const result = await TrainingServices.assignTrainingInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training assigned successfully',
    data: result,
  });
});

// ── Add Topic to Training ──
const addTopic = catchAsync(async (req, res) => {
  const result = await TrainingServices.addTopicToTrainingInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Topic added successfully',
    data: result,
  });
});

// ── Get Topics for a Training ──
const getTopics = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const result = await TrainingServices.getTopicsByTrainingIdFromDB(
    req.params.id as string,
    userId,
    userRole,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Topics retrieved successfully',
    data: result,
  });
});

// ── Get Single Topic ──
const getSingleTopic = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const result = await TrainingServices.getSingleTopicFromDB(
    req.params.id as string,
    req.params.topicId as string,
    userId,
    userRole,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Topic retrieved successfully',
    data: result,
  });
});

// ── Update Topic ──
const updateTopic = catchAsync(async (req, res) => {
  const result = await TrainingServices.updateTopicInDB(
    req.params.id as string,
    req.params.topicId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Topic updated successfully',
    data: result,
  });
});

// ── Delete Topic ──
const deleteTopic = catchAsync(async (req, res) => {
  await TrainingServices.deleteTopicFromTrainingInDB(
    req.params.id as string,
    req.params.topicId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Topic deleted successfully',
    data: null,
  });
});

// ── Add Module to Topic ──
const addModuleToTopic = catchAsync(async (req, res) => {
  const result = await TrainingServices.addModuleToTopicInDB(
    req.params.id as string,
    req.params.topicId as string,
    req.body.moduleIds,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module added to topic successfully',
    data: result,
  });
});

// ── Remove Module from Topic ──
const removeModuleFromTopic = catchAsync(async (req, res) => {
  const result = await TrainingServices.removeModuleFromTopicInDB(
    req.params.id as string,
    req.params.topicId as string,
    req.params.moduleId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module removed from topic successfully',
    data: result,
  });
});

// ── Reorder Topics ──
const reorderTopics = catchAsync(async (req, res) => {
  const result = await TrainingServices.reorderTopicsInDB(
    req.params.id as string,
    req.body.topicIds,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Topics reordered successfully',
    data: result,
  });
});

// ── Get Trainings by Company ──
const getTrainingsByCompany = catchAsync(async (req, res) => {
  const result = await TrainingServices.getTrainingsByCompanyFromDB(
    req.params.companyId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company trainings retrieved successfully',
    data: result,
  });
});

// ── Get My Trainings ──
const getMyTrainings = catchAsync(async (req, res) => {
  const result = await TrainingServices.getMyTrainingsFromDB(
    req.user.userId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My trainings retrieved successfully',
    data: result,
  });
});

// ── Get Training for User (public with progress) ──
const getTrainingForUser = catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const result = await TrainingServices.getTrainingForUserFromDB(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training retrieved successfully',
    data: result,
  });
});

// ── Authenticate for Training (Public) ──
const authenticateTraining = catchAsync(async (req, res) => {
  const result = await TrainingServices.authenticateTrainingInDB(
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Authenticated successfully',
    data: result,
  });
});

export const TrainingControllers = {
  createTraining,
  getAllTrainings,
  getSingleTraining,
  updateTraining,
  deleteTraining,
  duplicateTraining,
  assignTraining,
  getTopics,
  getSingleTopic,
  addTopic,
  updateTopic,
  deleteTopic,
  addModuleToTopic,
  removeModuleFromTopic,
  reorderTopics,
  getTrainingsByCompany,
  getMyTrainings,
  getTrainingForUser,
  authenticateTraining,
};
