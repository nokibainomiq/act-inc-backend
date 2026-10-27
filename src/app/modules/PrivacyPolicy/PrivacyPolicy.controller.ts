import { Request, Response } from 'express';

import AppError from '../../errors/AppError';

import httpStatus from 'http-status';

import PrivacyPolicy from './privacyPolicy.model';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';


// Controller to create or update Privacy Policy content
const createOrUpdatePrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const { privacyPolicy } = req.body;

  // Check if Privacy Policy exists; if it does, update, otherwise create
  const existingPrivacyPolicy = await PrivacyPolicy.findOne();

  if (existingPrivacyPolicy) {
    // Update the existing Privacy Policy record
    const updatedPrivacyPolicy = await PrivacyPolicy.updateOne(
      { _id: existingPrivacyPolicy._id },
      { privacyPolicy },
      { runValidators: true },
    );

    if (!updatedPrivacyPolicy.modifiedCount) {
      throw new AppError(httpStatus.BAD_REQUEST,('Failed to update Privacy Policy'));
    }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Privacy Policy created successfully',
      data: updatedPrivacyPolicy,
    });
  } else {
    // Create a new Privacy Policy record
    const newPrivacyPolicy = await PrivacyPolicy.create({ privacyPolicy });

    if (!newPrivacyPolicy) {
    throw new AppError(httpStatus.BAD_REQUEST,('Failed to createPrivacy Policy'));
    }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Privacy Policy created successfully',
      data: newPrivacyPolicy,
    });
  }
});

// Controller to get Privacy Policy content
const getPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const privacyPolicy = await PrivacyPolicy.findOne();

  if (!privacyPolicy) {
     throw new AppError(httpStatus.NOT_FOUND,('No Privacy Policy found!'));

  }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Privacy Policy created successfully',
      data: privacyPolicy,
    });
});

export default {
  createOrUpdatePrivacyPolicy,
  getPrivacyPolicy,
};