import { Model, Types } from 'mongoose';

// ── Training Status ──
export type TTrainingStatus = 'draft' | 'published';

// ── Topic Document ──
export interface ITopic {
  title: string;
  description?: string;
  trainingId: Types.ObjectId;
  moduleIds: Types.ObjectId[];
  order: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Training Document ──
export interface ITraining {
  title: string;
  description: string;
  thumbnailImage?: string;
  companyId?: Types.ObjectId;   // assigned to a company
  teamId?: Types.ObjectId;      // optionally scoped to a team
  authType: 'passcode' | 'email' | 'employeeId' | 'guest';
  passcode?: string;            // only if authType === 'passcode'
  qrCodeUrl?: string;           // auto-generated QR code link
  status: TTrainingStatus;
  isDeleted: boolean;
  createdBy: Types.ObjectId;    // Admin who created
  createdAt?: Date;
  updatedAt?: Date;
}

export type TTopicModel = Model<ITopic>;
export type TTrainingModel = Model<ITraining>;
