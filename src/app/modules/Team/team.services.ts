import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Team } from './team.model';
import { TTeam } from './team.interface';

const createTeamIntoDB = async (payload: TTeam) => {
  const result = await Team.create(payload);
  return result;
};

const getAllTeamsFromDB = async (
  query: Record<string, unknown>,
  userRole: string,
  companyId?: string,
) => {
  const filterQuery: Record<string, unknown> = {};

  // If logged in as company, only show their teams
  if (userRole === 'company' && companyId) {
    filterQuery.companyId = companyId;
  }

  const mergedQuery = { ...query, ...filterQuery };

  const queryBuilder = new QueryBuilder(Team.find(), mergedQuery);
  queryBuilder.search(['name']).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();
  return { meta, result };
};

const updateTeamInDB = async (
  id: string,
  payload: Partial<TTeam>,
  userRole: string,
  companyId?: string,
) => {
  // Company can only update their own teams
  if (userRole === 'company' && companyId) {
    const team = await Team.findById(id);
    if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
    if (team.companyId.toString() !== companyId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own teams');
    }
  }

  // If passcode is updated, hash it before saving
  if (payload.passcode) {
    payload.passcode = await bcrypt.hash(payload.passcode, 10);
  }

  const result = await Team.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  }
  return result;
};

const deleteTeamFromDB = async (
  id: string,
  userRole: string,
  companyId?: string,
) => {
  // Company can only delete their own teams
  if (userRole === 'company' && companyId) {
    const team = await Team.findById(id);
    if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
    if (team.companyId.toString() !== companyId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own teams');
    }
  }
  const result = await Team.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  }
  return result;
};

const getDropdownTeamsFromDB = async (
  userRole: string,
  companyId?: string,
) => {
  const filter: Record<string, unknown> = {};
  if (userRole === 'company' && companyId) {
    filter.companyId = companyId;
  }
  return Team.find(filter).select('_id name').lean();
};

// ── Company-scoped: all teams for a specific company (paginated) ──
const getAllTeamsByCompanyFromDB = async (companyId: string, query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(
    Team.find({ companyId }),
    query,
  );
  queryBuilder.search(['name']).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();
  return { meta, result };
};

// ── Company-scoped: team dropdown for a specific company ──
const getDropdownTeamsByCompanyFromDB = async (companyId: string) => {
  return Team.find({ companyId }).select('_id name').lean();
};

export const TeamServices = {
  createTeamIntoDB,
  getAllTeamsFromDB,
  getDropdownTeamsFromDB,
  getAllTeamsByCompanyFromDB,
  getDropdownTeamsByCompanyFromDB,
  updateTeamInDB,
  deleteTeamFromDB,
};
