import mongoose from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UserProgress } from '../UserProgress/userProgress.model';
import { Module } from '../Module/module.model';

const getModuleQuestionStats = async (moduleId: string, companyId?: string, role?: string) => {
  const matchStage: any = { 
    moduleId: new mongoose.Types.ObjectId(moduleId),
    'answers.0': { $exists: true }
  };

  if (role !== 'admin' && role !== 'superAdmin' && companyId) {
    matchStage.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const stats = await UserProgress.aggregate([
    { $match: matchStage },
    { $unwind: '$answers' },
    {
      $group: {
        _id: {
          questionId: '$answers.questionId',
          answer: '$answers.answer',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.questionId',
        totalAnswersForQuestion: { $sum: '$count' },
        responses: {
          $push: {
            answer: '$_id.answer',
            count: '$count',
          },
        },
      },
    },
  ]);

  const moduleData = await Module.findById(moduleId);
  if (!moduleData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found!');
  }

  const formattedStats = moduleData.questions.map((q: any) => {
    const questionStat = stats.find((s) => s._id === q.id?.toString() || s._id === q._id?.toString());
    
    let totalAnswers = 0;
    let responses: any[] = [];

    if (questionStat) {
      totalAnswers = questionStat.totalAnswersForQuestion;
      responses = questionStat.responses.map((r: any) => ({
        answer: r.answer,
        count: r.count,
        percentage: totalAnswers > 0 ? Number(((r.count / totalAnswers) * 100).toFixed(2)) : 0,
      }));
    }

    return {
      questionId: q.id || q._id,
      type: q.type,
      content: q.content,
      totalAnswers,
      responses,
    };
  });

  return {
    moduleId,
    moduleTitle: moduleData.title,
    stats: formattedStats,
  };
};

export const AnalyticsServices = {
  getModuleQuestionStats,
};
