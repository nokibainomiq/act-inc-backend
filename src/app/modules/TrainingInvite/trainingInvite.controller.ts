import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TrainingInviteServices } from './trainingInvite.services';

// ── Generate Share Link ──
const generateShareLink = catchAsync(async (req, res) => {
  const { email, expiresInDays } = req.body;
  const result = await TrainingInviteServices.generateShareLinkInDB(
    req.params.id as string,
    req.user.userId!,
    email,
    expiresInDays,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Share link generated successfully',
    data: result,
  });
});

// ── Send Invite by Email ──
const sendInvite = catchAsync(async (req, res) => {
  const result = await TrainingInviteServices.sendTrainingInviteByEmail(
    req.params.id as string,
    req.body.email,
    req.user.userId!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Invite sent successfully',
    data: result,
  });
});

// ── Get Training by Token (public) ──
const joinByToken = catchAsync(async (req, res) => {
  const result = await TrainingInviteServices.getTrainingByTokenFromDB(
    req.params.token as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Training retrieved successfully',
    data: result,
  });
});

// ── Get Invitations for a Training ──
const getInvitations = catchAsync(async (req, res) => {
  const companyId = req.user.role === 'company' ? req.user.userId : req.user.companyId;
  const result = await TrainingInviteServices.getInvitationsByTrainingFromDB(
    req.params.id as string,
    companyId,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Invitations retrieved successfully',
    data: result,
  });
});

// ── Resend Invite ──
const resendInvite = catchAsync(async (req, res) => {
  const result = await TrainingInviteServices.resendTrainingInviteByEmail(
    req.params.inviteId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reminder email sent successfully',
    data: result,
  });
});

export const TrainingInviteControllers = {
  generateShareLink,
  sendInvite,
  joinByToken,
  getInvitations,
  resendInvite,
};
