import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { CompanyReportControllers } from './companyReport.controller';

const router = express.Router();

// Reports for a company owner about their own learners (admins pass ?companyId=).
const reportAuth = auth(USER_ROLE.company, USER_ROLE.admin, USER_ROLE.superAdmin);

router.get('/overview', reportAuth, CompanyReportControllers.getOverview);
router.get('/teams', reportAuth, CompanyReportControllers.getTeams);
router.get('/teams/:teamId', reportAuth, CompanyReportControllers.getTeamDetail);
router.get('/learners', reportAuth, CompanyReportControllers.getLearners);
router.get('/learners/:userId', reportAuth, CompanyReportControllers.getLearnerDetail);
router.get('/modules', reportAuth, CompanyReportControllers.getModules);
router.get('/modules/:moduleId', reportAuth, CompanyReportControllers.getModuleDetail);
router.get('/access', reportAuth, CompanyReportControllers.getAccess);
router.get('/export', reportAuth, CompanyReportControllers.exportProgress);

export const CompanyReportRoutes = router;
