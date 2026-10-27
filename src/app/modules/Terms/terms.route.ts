import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';

import termsController from './terms.controller';
import auth from '../../middleware/auth';



const termsRouter = express.Router();

// Route to create or update Privacy Policy content (only accessible to admin or super-admin)
termsRouter.post(
  '/create-or-update',
   auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  termsController.createOrUpdateTerms
);

// Route to retrieve Privacy Policy content (accessible to everyone)
termsRouter.get(
  '/retrive',
 termsController.getTerms
);

export default termsRouter;