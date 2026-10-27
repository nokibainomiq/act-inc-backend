import { NextFunction, Request, Response } from 'express';



import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';

import sendResponse from '../../utils/sendResponse';
import { FAQServices } from './faq.services';




const getAllFaq = catchAsync(async(req:Request,res:Response)=>{

  const result = await FAQServices.getAllFAQFromDB(req?.query);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'FAQ retrived succesfully!',
      data: result,
    });

})
const getSingleFAQ = catchAsync(async(req:Request,res:Response)=>{
  const { id } = req.params;
  const result = await FAQServices.getSingleFAQFromDB(id as string);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'FAQ retrived succesfully!',
      data: result,
    });

})


const createFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
//   console.log("create revieew-->",req.body);
  const path = `${req.protocol}://${req.get('host')}/uploads/${req.file?.filename}`;
const payload = req.body
payload.image = path
payload.user = req?.user?.userId
  try {
    const result = await  FAQServices.addFAQIntoDB(payload);

    sendResponse(res, {
      success: true,
      message: 'FAQ Created Successfull',
      statusCode: httpStatus.CREATED,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await FAQServices.deleteFAQFromDB(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQ deleted successfully!',
    data: result,
  });
})

const editFaq = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
//   console.log("create revieew-->",req.body);
  try {
 
  const {id} = req.params;
  const path = `${req.protocol}://${req.get('host')}/uploads/${req.file?.filename}`;
const payload = req.body;
payload.image = path;


    // console.log("Data with file paths: ", data);
    
    const result = await FAQServices.updateFAQFromDB(id as string,payload)
    sendResponse(res, {
      success: true,
      message: `FAQ Edited Succesfull`,
      statusCode: httpStatus.OK,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const FaqControllers = {
createFAQ,editFaq,getAllFaq,getSingleFAQ,deleteFaq
};
