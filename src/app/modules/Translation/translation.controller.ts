import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TranslationServices } from './translation.services';

const translateScreen = catchAsync(async (req: Request, res: Response) => {
  const result = await TranslationServices.translateScreenTexts(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Screen translated successfully',
    data: result,
  });
});

const getScreenTranslations = catchAsync(async (req: Request, res: Response) => {
  const result = await TranslationServices.getScreenTranslationsFromDB(
    req.query as { screen?: string; targetLang?: string }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Screen translations retrieved from cache successfully',
    data: result,
  });
});

export const TranslationControllers = {
  translateScreen,
  getScreenTranslations,
};
