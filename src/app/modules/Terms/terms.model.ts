import mongoose from 'mongoose';
import { ITerms } from './terms.interface';

export const privacyPolicySchema = new mongoose.Schema<ITerms>(
  {
    termsCondition: String,
  },
  {
    timestamps: true,
  },
);

const Terms = mongoose.model<ITerms>('terms', privacyPolicySchema);
export default Terms;
