/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express';



import { USER_ROLE } from '../Auth/auth.constant';

import { FaqControllers } from './faq.controller';
import auth from '../../middleware/auth';


const router = express.Router();

router.post(
  '/create-faq',

  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
//   validateRequest(EventCreateSchema),
  FaqControllers.createFAQ,
);

// router.get('/retrive/:userId',UserControllers.getSingleUser)

router.get('/allFaq', FaqControllers.getAllFaq);

router.get('/single-faq/:id',FaqControllers.getSingleFAQ);


router.delete('/delete-faq/:id',FaqControllers.deleteFaq);
router.patch('/update-faq/:id',
  
    FaqControllers.editFaq);

export const FaqRoutes = router;
