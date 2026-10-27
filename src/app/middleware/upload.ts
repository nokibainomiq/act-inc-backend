import { Request } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';
import s3Client from '../utils/s3';
import config from '../config';

const uploadImage = async (
  req: Request,
  file?: Express.Multer.File,
): Promise<string> => {
  const target = file ?? req.file;

  if (!target) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please upload a file');
  }

  const fileExtension = target.originalname ? target.originalname.split('.').pop() : '';
  const key = `wee-plan/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension ? '.' + fileExtension : ''}`;

  const command = new PutObjectCommand({
    Bucket: config.aws_s3_bucket,
    Key: key,
    Body: target.buffer,
    ContentType: target.mimetype,
  });

  try {
    await s3Client.send(command);
    const region = config.aws_region || 'eu-central-1';
    const bucket = config.aws_s3_bucket;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error: any) {
    console.error('S3 Upload Error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `S3 Upload Failed: ${error?.message || 'Unknown error'}`,
    );
  }
};

export default uploadImage;