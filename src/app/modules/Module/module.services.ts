import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Module } from './module.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { Team } from '../Team/team.model';
import { User } from '../User/user.model';
import { Topic } from '../Training/training.model';

// ── Create Module ──
const createModuleInDB = async (payload: any, userId: string) => {
  payload.createdBy = userId;
  const result = await Module.create(payload);
  return result;
};

// ── Get All Modules (with search, filter, pagination) ──
const getAllModulesFromDB = async (query: Record<string, unknown>) => {
  const moduleQuery = new QueryBuilder(
    Module.find({ isDeleted: false }).populate('createdBy', 'firstName lastName email'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await moduleQuery.modelQuery;
  const meta = await moduleQuery.countTotal();

  return { result, meta };
};

// ── Get All Modules for Dropdown ──
const getAllModulesForDropdownFromDB = async () => {
  const result = await Module.find({ isDeleted: false })
    .select('_id title')
    .sort({ createdAt: -1 });

  return result;
};

// ── Get Single Module ──
const getModuleByIdFromDB = async (id: string) => {
  const result = await Module.findOne({ _id: id, isDeleted: false }).populate(
    'createdBy',
    'firstName lastName email',
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  const moduleObj = result.toObject();
  const scoredQuestions = moduleObj.questions.filter((q: any) => q.isScored !== false);
  const hasScoredQuestions = scoredQuestions.length > 0;
  const score = hasScoredQuestions ? scoredQuestions.length * 100 : null;

  return { ...moduleObj, score, hasScoredQuestions };
};

// ── Update Module ──
const updateModuleInDB = async (id: string, payload: any) => {
  const isExist = await Module.findOne({ _id: id, isDeleted: false });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  // Handle thumbnail update — payload.thumbnailImage may come from
  // the controller after Cloudinary upload, or from req.body.data
  const result = await Module.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'firstName lastName email');

  return result;
};

// ── Delete Module (soft delete) ──
const deleteModuleFromDB = async (id: string) => {
  const isExist = await Module.findOne({ _id: id, isDeleted: false });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  await Module.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

  // Remove module reference from all topics
  await Topic.updateMany({ moduleIds: id }, { $pull: { moduleIds: id } });

  return null;
};

// ── Duplicate Module ──
const duplicateModuleInDB = async (id: string, newTitle: string, userId: string) => {
  const original = await Module.findOne({ _id: id, isDeleted: false }).lean();

  if (!original) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  // Create a deep copy without _id and timestamps, with new title
  const duplicatedPayload = {
    title: newTitle,
    description: original.description,
    thumbnailImage: original.thumbnailImage,
    questions: original.questions.map((q: any) => {
      // Assign new unique ids to each question
      const { _id, ...rest } = q;
      return {
        ...rest,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
    }),
    status: 'draft' as const,
    createdBy: userId,
  };

  const result = await Module.create(duplicatedPayload);
  return result;
};

// ── Assign Modules to Team (single or bulk) ──
const assignModulesToTeam = async (payload: { moduleId?: string; moduleIds?: string[]; companyId: string; teamId: string }) => {
  const { moduleId, moduleIds, companyId, teamId } = payload;

  // Validate company exists and is active (company is a User with role: 'company')
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }
  if (company.status !== 'active') {
    throw new AppError(httpStatus.FORBIDDEN, 'Company account is not active');
  }

  // Validate team exists and belongs to this company
  const team = await Team.findOne({ _id: teamId, companyId: companyId });
  if (!team) {
    throw new AppError(httpStatus.NOT_FOUND, 'Team not found in this company');
  }

  // Single module assignment
  if (moduleId) {
    const module = await Module.findOne({ _id: moduleId, isDeleted: false });
    if (!module) {
      throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
    }

    const result = await Module.findByIdAndUpdate(
      moduleId,
      { teamId, companyId, status: 'published' },
      { new: true, runValidators: true },
    ).populate('createdBy', 'firstName lastName email');

    return { updatedCount: 1, modules: [result] };
  }

  // Bulk module assignment
  if (moduleIds && moduleIds.length > 0) {
    const result = await Module.updateMany(
      { _id: { $in: moduleIds }, isDeleted: false },
      { teamId, companyId, status: 'published' },
      { runValidators: true },
    );

    const updatedModules = await Module.find({
      _id: { $in: moduleIds },
      isDeleted: false,
    }).populate('createdBy', 'firstName lastName email');

    return { updatedCount: result.modifiedCount, modules: updatedModules };
  }

  throw new AppError(httpStatus.BAD_REQUEST, 'Either moduleId or moduleIds is required');
};

// ── Unassign Module from Team ──
const unassignModuleFromTeam = async (moduleId: string) => {
  const module = await Module.findOne({ _id: moduleId, isDeleted: false });
  if (!module) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  const result = await Module.findByIdAndUpdate(
    moduleId,
    { teamId: null, companyId: null },
    { new: true, runValidators: true },
  ).populate('createdBy', 'firstName lastName email');

  return result;
};

// ── Get Modules by Team ──
const getModulesByTeam = async (teamId: string) => {
  const modules = await Module.find({ teamId, isDeleted: false })
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  return modules;
};

// ── Get Modules by Company (via teams or direct companyId) ──
const getModulesByCompany = async (companyId: string) => {
  // Find all team IDs belonging to this company
  const { Team } = await import('../Team/team.model');
  const teams = await Team.find({ companyId }).select('_id').lean();
  const teamIds = teams.map((t) => t._id);

  const modules = await Module.find({
    $or: [{ companyId }, { teamId: { $in: teamIds } }],
    isDeleted: false,
  })
    .populate('createdBy', 'firstName lastName email')
    .populate('teamId', 'name companyId')
    .sort({ createdAt: -1 });

  return modules;
};

export const ModuleServices = {
  createModuleInDB,
  getAllModulesFromDB,
  getAllModulesForDropdownFromDB,
  getModuleByIdFromDB,
  updateModuleInDB,
  deleteModuleFromDB,
  duplicateModuleInDB,
  assignModulesToTeam,
  unassignModuleFromTeam,
  getModulesByTeam,
  getModulesByCompany,
};
