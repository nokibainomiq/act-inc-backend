import { Request } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { CompanyReportServices } from './companyReport.services';

// A company reads its own reports; an admin names the company with ?companyId=.
const reportCompanyId = (req: Request) => {
  if (req.user.role === 'company') return req.user.userId as string;
  const companyId = req.query.companyId;
  if (typeof companyId !== 'string' || !companyId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'companyId is required');
  }
  return companyId;
};

const respond = (message: string, load: (req: Request) => Promise<unknown>) =>
  catchAsync(async (req, res) => {
    const data = await load(req);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });
  });

const getOverview = respond('Company overview retrieved successfully', (req) =>
  CompanyReportServices.getOverview(reportCompanyId(req)),
);

const getTeams = respond('Team report retrieved successfully', (req) =>
  CompanyReportServices.getTeams(reportCompanyId(req)),
);

const getTeamDetail = respond('Team detail retrieved successfully', (req) =>
  CompanyReportServices.getTeamDetail(reportCompanyId(req), req.params.teamId as string),
);

const getLearners = respond('Learner report retrieved successfully', (req) =>
  CompanyReportServices.getLearners(reportCompanyId(req), req.query),
);

const getLearnerDetail = respond('Learner detail retrieved successfully', (req) =>
  CompanyReportServices.getLearnerDetail(reportCompanyId(req), req.params.userId as string),
);

const getModules = respond('Module report retrieved successfully', (req) =>
  CompanyReportServices.getModules(reportCompanyId(req)),
);

const getModuleDetail = respond('Module insights retrieved successfully', (req) =>
  CompanyReportServices.getModuleDetail(reportCompanyId(req), req.params.moduleId as string),
);

const getAccess = respond('Access report retrieved successfully', (req) =>
  CompanyReportServices.getAccess(reportCompanyId(req)),
);

const exportProgress = catchAsync(async (req, res) => {
  const { filename, csv } = await CompanyReportServices.exportProgressCsv(reportCompanyId(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const CompanyReportControllers = {
  getOverview,
  getTeams,
  getTeamDetail,
  getLearners,
  getLearnerDetail,
  getModules,
  getModuleDetail,
  getAccess,
  exportProgress,
};
