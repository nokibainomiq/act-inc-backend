import { Model, Types } from 'mongoose';

export type TAssessmentType = 'baseline' | 'follow_up';

export interface IBehavioralMetric {
  name: string;
  score: number; // 0-10 scale
}

export interface IBehavioralAssessment {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  teamId?: Types.ObjectId;
  type: TAssessmentType;
  assessmentDate: Date;
  metrics: IBehavioralMetric[];
  overallScore: number; // 0-10 average
  completedAt?: Date;
}

export interface BehavioralAssessmentModel extends Model<IBehavioralAssessment> {
  getUserAssessments(userId: string): Promise<IBehavioralAssessment[]>;
  getCompanyAssessments(companyId: string, type?: TAssessmentType): Promise<IBehavioralAssessment[]>;
  getTeamAssessments(teamId: string, type?: TAssessmentType): Promise<IBehavioralAssessment[]>;
  getCompanyMetricAverages(companyId: string, type: TAssessmentType): Promise<Record<string, number>>;
  getCompanyOverallAverage(companyId: string, type: TAssessmentType): Promise<number>;
  getTeamMetricAverages(teamId: string, type: TAssessmentType): Promise<Record<string, number>>;
  getTeamOverallAverage(teamId: string, type: TAssessmentType): Promise<number>;
}