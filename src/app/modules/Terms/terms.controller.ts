import { Request, Response } from 'express';

import AppError from '../../errors/AppError';

import httpStatus from 'http-status';


import Terms from './terms.model';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';


// Controller to create or update Privacy Policy content
const createOrUpdateTerms = catchAsync(async (req: Request, res: Response) => {
  const { termsCondition } = req.body;

  // Check if Privacy Policy exists; if it does, update, otherwise create
  const existingTerms = await Terms.findOne();

  if (existingTerms) {
    // Update the existing Privacy Policy record
    const updatedPrivacyPolicy = await Terms.updateOne(
      { _id: existingTerms._id },
      { termsCondition },
      { runValidators: true },
    );

    if (!updatedPrivacyPolicy.modifiedCount) {
      throw new AppError(httpStatus.BAD_REQUEST,('Failed to update Privacy Policy'));
    }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Terms created successfully',
      data: updatedPrivacyPolicy,
    });
  } else {
    // Create a new Privacy Policy record
    const newTerms = await Terms.create({ termsCondition });

    if (!newTerms) {
    throw new AppError(httpStatus.BAD_REQUEST,('Failed to Terms and condition'));
    }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Terms & Condition created successfully',
      data: newTerms,
    });
  }
});

// Controller to get Privacy Policy content
const getTerms = catchAsync(async (req: Request, res: Response) => {
  const terms = await Terms.findOne();

  if (!terms) {
     throw new AppError(httpStatus.NOT_FOUND,('No Terms found!'));

  }

   return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Terms retrived successfully',
      data: terms,
    });
});

export default {
  createOrUpdateTerms,
  getTerms,
};