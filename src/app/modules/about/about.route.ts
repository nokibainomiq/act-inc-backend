import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';

import termsController from './about.controller';
import auth from '../../middleware/auth';



const aboutRouter = express.Router();

// Route to create or update Privacy Policy content (only accessible to admin or super-admin)
aboutRouter.post(
  '/create-or-update',
  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  termsController.createOrUpdateTerms
);

// Route to retrieve Privacy Policy content (accessible to everyone)
aboutRouter.get(
  '/retrive',
 termsController.getTerms
);

export default aboutRouter;