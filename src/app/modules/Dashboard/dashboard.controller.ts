import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DashboardServices } from './dashboard.services';

// ── Get Platform Stats (cards) ──
const getPlatformStats = catchAsync(async (req, res) => {
  const result = await DashboardServices.getPlatformStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Platform stats retrieved successfully',
    data: result,
  });
});

// ── Get Company Breakdown Table ──
const getCompanyBreakdown = catchAsync(async (req, res) => {
  const result = await DashboardServices.getCompanyBreakdown();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company breakdown retrieved successfully',
    data: result,
  });
});

// ── Get Full Dashboard Data ──
const getDashboardData = catchAsync(async (req, res) => {
  const result = await DashboardServices.getDashboardData();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

export const DashboardControllers = {
  getPlatformStats,
  getCompanyBreakdown,
  getDashboardData,
};
