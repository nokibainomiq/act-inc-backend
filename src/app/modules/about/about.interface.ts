import { Document } from 'mongoose';

export interface IAbout extends Document {
  aboutUs: string;
}