import nodemailer from 'nodemailer';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

interface IMailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async (options: IMailOptions): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Act-Inc" <${config.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error: any) {
    console.error('Error sending mail: ', error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send email');
  }
};

export default sendEmail;