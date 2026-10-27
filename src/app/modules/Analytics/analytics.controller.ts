import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.services';

const getModuleQuestionStats = catchAsync(async (req, res) => {
  const { moduleId } = req.params;
  const companyId = req.user.role === 'company' ? req.user.userId : req.user.companyId;
  const role = req.user.role;

  const result = await AnalyticsServices.getModuleQuestionStats(moduleId as string , companyId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module question statistics retrieved successfully',
    data: result,
  });
});

export const AnalyticsControllers = {
  getModuleQuestionStats,
};
