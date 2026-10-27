import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { CompanyControllers } from './company.controller';
import { CompanyValidation } from './company.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// ── superAdmin only: CRUD ──
router.post(
  '/create-company',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(CompanyValidation.createCompanySchema),
  CompanyControllers.createCompany,
);

router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  CompanyControllers.getAllCompanies,
);

router.get(
  '/dropdown',
  // auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  CompanyControllers.getDropdownCompanies,
);

// ── Public Branding Routes (NO AUTH REQUIRED FOR LOGIN/INVITE SCREENS) ──
router.get(
  '/public-branding/:idOrSlug',
  CompanyControllers.getPublicBranding,
);

router.post(
  '/public-branding-by-email',
  CompanyControllers.getPublicBrandingByEmail,
);

router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  CompanyControllers.getSingleCompany,
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(CompanyValidation.updateCompanySchema),
  CompanyControllers.updateCompany,
);

// ── Branding: superAdmin (any company) or company (own company) ──
router.patch(
  '/:id/branding',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]) as any,
  validateRequest(CompanyValidation.updateBrandingSchema),
  CompanyControllers.updateBranding,
);

router.patch(
  '/:id/status',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(CompanyValidation.updateCompanyStatusSchema),
  CompanyControllers.updateCompanyStatus,
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  CompanyControllers.deleteCompany,
);

// ── Company Details Dashboard API ──
router.get(
  '/:id/details',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  CompanyControllers.getCompanyDetails,
);

// ── Download Company Details PDF Report (1-Click Download) ──
router.get(
  '/:id/download-report',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.company),
  CompanyControllers.downloadCompanyReportPDF,
);

export const CompanyRoutes = router;
