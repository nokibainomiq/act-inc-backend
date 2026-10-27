import { Model, Types } from 'mongoose';

export type TProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface IUserProgress {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  teamId?: Types.ObjectId;
  moduleId: Types.ObjectId;
  status: TProgressStatus;
  progressPercentage: number; // 0-100
  score?: number | null; // 0-100, null for unscored modules
  completedQuestions: number;
  totalQuestions: number;
  startedAt?: Date;
  completedAt?: Date;
  lastAttemptAt?: Date;
  answers?: {
    questionId: string;
    answer: any;
    isCorrect?: boolean;
    score?: number;
    answeredAt: Date;
  }[];
}

export interface UserProgressModel extends Model<IUserProgress> {
  getUserProgress(userId: string, moduleId: string): Promise<IUserProgress | null>;
  getCompanyProgress(companyId: string): Promise<IUserProgress[]>;
  getTeamProgress(teamId: string): Promise<IUserProgress[]>;
  getModuleCompletionStats(companyId: string, moduleId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    avgScore: number;
    avgProgress: number;
  }>;
}