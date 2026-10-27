import { Schema, model } from 'mongoose';
import { IBehavioralAssessment, BehavioralAssessmentModel, TAssessmentType } from './behavioralAssessment.interface';

const metricSchema = new Schema(
  {
    name: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
  },
  { _id: false },
);

const behavioralAssessmentSchema = new Schema<IBehavioralAssessment, BehavioralAssessmentModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    type: {
      type: String,
      enum: ['baseline', 'follow_up'],
      required: true,
    },
    assessmentDate: { type: Date, required: true, default: Date.now },
    metrics: { type: [metricSchema], required: true },
    overallScore: { type: Number, required: true, min: 0, max: 10 },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
behavioralAssessmentSchema.index({ userId: 1, type: 1 });
behavioralAssessmentSchema.index({ companyId: 1, type: 1 });
behavioralAssessmentSchema.index({ teamId: 1, type: 1 });
behavioralAssessmentSchema.index({ assessmentDate: -1 });

// Static methods
behavioralAssessmentSchema.statics.getUserAssessments = async function (userId: string) {
  return await this.find({ userId }).sort({ assessmentDate: -1 });
};

behavioralAssessmentSchema.statics.getCompanyAssessments = async function (
  companyId: string,
  type?: TAssessmentType,
) {
  const query: any = { companyId };
  if (type) query.type = type;
  return await this.find(query).populate('userId', 'firstName lastName email image').populate('teamId', 'name');
};

behavioralAssessmentSchema.statics.getTeamAssessments = async function (
  teamId: string,
  type?: TAssessmentType,
) {
  const query: any = { teamId };
  if (type) query.type = type;
  return await this.find(query).populate('userId', 'firstName lastName email image');
};

behavioralAssessmentSchema.statics.getCompanyMetricAverages = async function (
  companyId: string,
  type: TAssessmentType,
) {
  const result = await this.aggregate([
    { $match: { companyId: new Schema.Types.ObjectId(companyId), type } },
    { $unwind: '$metrics' },
    {
      $group: {
        _id: '$metrics.name',
        avgScore: { $avg: '$metrics.score' },
      },
    },
  ]);

  const averages: Record<string, number> = {};
  result.forEach((r) => {
    averages[r._id] = Math.round(r.avgScore * 10) / 10; // Round to 1 decimal
  });
  return averages;
};

behavioralAssessmentSchema.statics.getCompanyOverallAverage = async function (
  companyId: string,
  type: TAssessmentType,
) {
  const result = await this.aggregate([
    { $match: { companyId: new Schema.Types.ObjectId(companyId), type } },
    { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
  ]);
  return result.length > 0 ? Math.round(result[0].avgScore * 10) / 10 : 0;
};

behavioralAssessmentSchema.statics.getTeamMetricAverages = async function (
  teamId: string,
  type: TAssessmentType,
) {
  const result = await this.aggregate([
    { $match: { teamId: new Schema.Types.ObjectId(teamId), type } },
    { $unwind: '$metrics' },
    {
      $group: {
        _id: '$metrics.name',
        avgScore: { $avg: '$metrics.score' },
      },
    },
  ]);

  const averages: Record<string, number> = {};
  result.forEach((r) => {
    averages[r._id] = Math.round(r.avgScore * 10) / 10;
  });
  return averages;
};

behavioralAssessmentSchema.statics.getTeamOverallAverage = async function (
  teamId: string,
  type: TAssessmentType,
) {
  const result = await this.aggregate([
    { $match: { teamId: new Schema.Types.ObjectId(teamId), type } },
    { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
  ]);
  return result.length > 0 ? Math.round(result[0].avgScore * 10) / 10 : 0;
};

export const BehavioralAssessment = model<IBehavioralAssessment, BehavioralAssessmentModel>(
  'BehavioralAssessment',
  behavioralAssessmentSchema,
);