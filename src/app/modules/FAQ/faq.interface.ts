import { Document} from 'mongoose';

// TypeScript interface
export interface IFAQ extends Document {
  Ques: string;
  Answere: string;
}
