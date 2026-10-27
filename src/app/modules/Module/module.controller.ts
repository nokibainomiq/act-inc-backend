import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ModuleServices } from './module.services';
import uploadImage from '../../middleware/upload';

import { Request } from 'express';

// Helper to process multiple dynamic files (thumbnailImage, questions[0].callerPhoto, etc.)
const processDynamicFiles = async (req: Request, payload: any) => {
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = req.files.map(async (file) => {
      const url = await uploadImage(req, file);
      const fieldname = file.fieldname;

      if (fieldname === 'thumbnailImage') {
        payload.thumbnailImage = url;
      } else {
        const match = fieldname.match(/^questions\[(\d+)\]\.(.+)$/);
        if (match && payload.questions) {
          const index = parseInt(match[1], 10);
          const prop = match[2];
          if (payload.questions[index]) {
            payload.questions[index][prop] = url;
          }
        }
      }
    });

    await Promise.all(uploadPromises);
  }
  return payload;
};

// ── Create Module (supports multipart for dynamic files) ──
const createModule = catchAsync(async (req, res) => {
  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = await processDynamicFiles(req, data);

  const result = await ModuleServices.createModuleInDB(payload, req.user.userId!);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Module created successfully',
    data: result,
  });
});

// ── Get All Modules ──
const getAllModules = catchAsync(async (req, res) => {
  const result = await ModuleServices.getAllModulesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Modules retrieved successfully',
    data: result.result,
    meta: result.meta,
  });
});

// ── Get All Modules for Dropdown ──
const getAllModulesForDropdown = catchAsync(async (req, res) => {
  const result = await ModuleServices.getAllModulesForDropdownFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Modules dropdown retrieved successfully',
    data: result,
  });
});

// ── Get Single Module ──
const getModuleById = catchAsync(async (req, res) => {
  const result = await ModuleServices.getModuleByIdFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module retrieved successfully',
    data: result,
  });
});

// ── Update Module (supports multipart for dynamic files) ──
const updateModule = catchAsync(async (req, res) => {
  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = await processDynamicFiles(req, data);

  const result = await ModuleServices.updateModuleInDB(req.params.id as string, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module updated successfully',
    data: result,
  });
});

// ── Delete Module ──
const deleteModule = catchAsync(async (req, res) => {
  await ModuleServices.deleteModuleFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module deleted successfully',
    data: null,
  });
});

// ── Duplicate Module ──
const duplicateModule = catchAsync(async (req, res) => {
  const result = await ModuleServices.duplicateModuleInDB(
    req.params.id as string,
    req.body.title,
    req.user.userId!,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Module duplicated successfully',
    data: result,
  });
});

// ── Assign Modules to Team ──
const assignModulesToTeam = catchAsync(async (req, res) => {
  const result = await ModuleServices.assignModulesToTeam(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Modules assigned to team successfully',
    data: result,
  });
});

// ── Unassign Module from Team ──
const unassignModuleFromTeam = catchAsync(async (req, res) => {
  const result = await ModuleServices.unassignModuleFromTeam(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Module unassigned from team successfully',
    data: result,
  });
});

// ── Get Modules by Team ──
const getModulesByTeam = catchAsync(async (req, res) => {
  const result = await ModuleServices.getModulesByTeam(req.params.teamId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team modules retrieved successfully',
    data: result,
  });
});

// ── Get Modules by Company (via teams) ──
const getModulesByCompany = catchAsync(async (req, res) => {
  const result = await ModuleServices.getModulesByCompany(req.params.companyId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company modules retrieved successfully',
    data: result,
  });
});

export const ModuleControllers = {
  createModule,
  getAllModules,
  getAllModulesForDropdown,
  getModuleById,
  updateModule,
  deleteModule,
  duplicateModule,
  assignModulesToTeam,
  unassignModuleFromTeam,
  getModulesByTeam,
  getModulesByCompany,
};
