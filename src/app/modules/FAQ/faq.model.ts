import mongoose, { Schema } from 'mongoose';
import { IFAQ } from './faq.interface';


// Mongoose schema
const FAQSchema: Schema = new Schema<IFAQ>(
  {
    Ques: { type: String, required: true, trim: true },
    Answere: { type: String, required: true, trim: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Export model
const FAQModel = mongoose.model<IFAQ>('FAQ', FAQSchema);

export default FAQModel;
