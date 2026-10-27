import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TeamServices } from './team.services';

const createTeam = catchAsync(async (req, res) => {
  const result = await TeamServices.createTeamIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Team created successfully',
    data: result,
  });
});

const getAllTeams = catchAsync(async (req, res) => {
  const { role, companyId } = req.user;
  const result = await TeamServices.getAllTeamsFromDB(req.query, role, companyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Teams retrieved successfully',
    data: result,
  });
});

const updateTeam = catchAsync(async (req, res) => {
  const { role, companyId } = req.user;
  const result = await TeamServices.updateTeamInDB(req.params.id as string, req.body, role, companyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team updated successfully',
    data: result,
  });
});

const deleteTeam = catchAsync(async (req, res) => {
  const { role, companyId } = req.user;
  const result = await TeamServices.deleteTeamFromDB(req.params.id as string, role, companyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team deleted successfully',
    data: result,
  });
});

const getDropdownTeams = catchAsync(async (req, res) => {
  const { role, companyId } = req.user;
  const result = await TeamServices.getDropdownTeamsFromDB(role, companyId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team dropdown data retrieved successfully',
    data: result,
  });
});

const getAllTeamsByCompany = catchAsync(async (req, res) => {
  const result = await TeamServices.getAllTeamsByCompanyFromDB(
    req.params.companyId as string,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Teams retrieved successfully',
    data: result,
  });
});

const getDropdownTeamsByCompany = catchAsync(async (req, res) => {
  const result = await TeamServices.getDropdownTeamsByCompanyFromDB(
    req.params.companyId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team dropdown data retrieved successfully',
    data: result,
  });
});

export const TeamControllers = {
  createTeam,
  getAllTeams,
  getDropdownTeams,
  getAllTeamsByCompany,
  getDropdownTeamsByCompany,
  updateTeam,
  deleteTeam,
};
