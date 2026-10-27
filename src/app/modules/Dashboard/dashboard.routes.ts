import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { DashboardControllers } from './dashboard.controller';

const router = express.Router();

// ── Dashboard Routes (Super Admin & Admin only) ──

// GET /dashboard → Full dashboard data (stats + table)
router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  DashboardControllers.getDashboardData,
);

// GET /dashboard/stats → Only stats cards
router.get(
  '/stats',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  DashboardControllers.getPlatformStats,
);

// GET /dashboard/companies → Only company breakdown table
router.get(
  '/companies',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  DashboardControllers.getCompanyBreakdown,
);

export const DashboardRoutes = router;
