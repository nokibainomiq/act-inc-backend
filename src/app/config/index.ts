import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  server_url: process.env.SERVER_URL,
  frontend_url: process.env.FRONTEND_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  smtp_from: process.env.SMTP_FROM,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.APP_PASSWARD,
  // stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  // stripe_webhook_secret_key: process.env.WEBHOOK_SECRET_KEY,
  aws_s3_bucket: process.env.AWS_S3_BUCKET,
  aws_region: process.env.AWS_REGION,
  aws_s3_secret_key: process.env.AWS_S3_SECRET_KEY,
  aws_s3_access_key: process.env.AWS_S3_ACCESS_KEY,
super_admin_email: process.env.SUPER_ADMIN_EMAIL,
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
  super_admin_first_name: process.env.SUPER_ADMIN_FIRST_NAME,
  super_admin_last_name: process.env.SUPER_ADMIN_LAST_NAME,
  jwt_guest_access_expires_in: process.env.JWT_GUEST_ACCESS_EXPIRES_IN || '4h',
  google_translate_api_key: process.env.GOOGLE_TRANSLATE_API_KEY,
};
