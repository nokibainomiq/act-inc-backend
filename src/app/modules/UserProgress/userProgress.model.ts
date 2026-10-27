import { Schema, model } from 'mongoose';
import { IUserProgress, UserProgressModel, TProgressStatus } from './userProgress.interface';

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean },
    score: { type: Number },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userProgressSchema = new Schema<IUserProgress, UserProgressModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    score: { type: Number, default: 0, min: 0, max: 100 },
    completedQuestions: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastAttemptAt: { type: Date },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true },
);

// Indexes for performance
userProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });
userProgressSchema.index({ companyId: 1 });
userProgressSchema.index({ teamId: 1 });
userProgressSchema.index({ moduleId: 1 });
userProgressSchema.index({ status: 1 });

// Static methods
userProgressSchema.statics.getUserProgress = async function (
  userId: string,
  moduleId: string,
) {
  return await this.findOne({ userId, moduleId });
};

userProgressSchema.statics.getCompanyProgress = async function (companyId: string) {
  return await this.find({ companyId }).populate('userId', 'firstName lastName email image').populate('moduleId', 'title');
};

userProgressSchema.statics.getTeamProgress = async function (teamId: string) {
  return await this.find({ teamId }).populate('userId', 'firstName lastName email image').populate('moduleId', 'title');
};

userProgressSchema.statics.getModuleCompletionStats = async function (
  companyId: string,
  moduleId: string,
) {
  const stats = await this.aggregate([
    { $match: { companyId: new Schema.Types.ObjectId(companyId), moduleId: new Schema.Types.ObjectId(moduleId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        avgProgress: { $avg: '$progressPercentage' },
      },
    },
  ]);

  const result = {
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    avgScore: 0,
    avgProgress: 0,
  };

  stats.forEach((s) => {
    result.total += s.count;
    if (s._id === 'completed') result.completed = s.count;
    else if (s._id === 'in_progress') result.inProgress = s.count;
    else if (s._id === 'not_started') result.notStarted = s.count;
    if (s.avgScore) result.avgScore = Math.round(s.avgScore);
    if (s.avgProgress) result.avgProgress = Math.round(s.avgProgress);
  });

  return result;
};

export const UserProgress = model<IUserProgress, UserProgressModel>('UserProgress', userProgressSchema);