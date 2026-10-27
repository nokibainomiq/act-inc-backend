import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserProgressServices } from './userProgress.services';

// ── Get My Learning Path (User Dashboard & Assigned Modules) ──
const getMyLearningPath = catchAsync(async (req, res) => {
  const result = await UserProgressServices.getMyLearningPathFromDB(
    req.user.userId,
    req.query.status as string,
    req.user.companyId,
    req.user.teamId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My learning path retrieved successfully',
    data: result,
  });
});

// ── Get Single Module for User ──
const getModuleForUser = catchAsync(async (req, res) => {
  const result = await UserProgressServices.getModuleForUserFromDB(
    req.user.userId,
    req.params.moduleId as string,
    req.user.companyId,
    req.user.teamId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module details retrieved successfully',
    data: result,
  });
});

// ── Submit Answer for a Question ──
const submitAnswer = catchAsync(async (req, res) => {
  const result = await UserProgressServices.submitAnswerInDB(
    req.user.userId,
    req.body,
    req.user.companyId,
    req.user.teamId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Answer submitted and evaluated successfully',
    data: result,
  });
});

// ── Complete Module ──
const completeModule = catchAsync(async (req, res) => {
  const result = await UserProgressServices.completeModuleInDB(
    req.user.userId,
    req.params.moduleId as string,
    req.user.companyId,
    req.user.teamId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module completed successfully',
    data: result,
  });
});

// ── Get Team Performance Stats ──
const getTeamPerformance = catchAsync(async (req, res) => {
  const teamId = (req.params.teamId as string) || req.user.teamId;

  if (!teamId) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'teamId is required',
      data: null,
    });
  }

  const result = await UserProgressServices.getTeamPerformanceFromDB(teamId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team performance retrieved successfully',
    data: result,
  });
});

// ── Get Company Performance Stats ──
const getCompanyPerformance = catchAsync(async (req, res) => {
  const companyId = (req.params.companyId as string) || req.user.companyId;

  if (!companyId) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'companyId is required',
      data: null,
    });
  }

  const result = await UserProgressServices.getCompanyPerformanceFromDB(companyId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company performance retrieved successfully',
    data: result,
  });
});

export const UserProgressControllers = {
  getMyLearningPath,
  getModuleForUser,
  submitAnswer,
  completeModule,
  getTeamPerformance,
  getCompanyPerformance,
};
