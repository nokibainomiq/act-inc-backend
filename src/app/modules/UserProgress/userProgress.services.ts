import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { UserProgress } from './userProgress.model';
import { Module } from '../Module/module.model';
import { User } from '../User/user.model';
import { Team } from '../Team/team.model';

// ── Get My Learning Path (User Dashboard & Assigned Modules) ──
const getMyLearningPathFromDB = async (
  userId?: string,
  queryStatus?: string,
  guestCompanyId?: string,
  guestTeamId?: string,
) => {
  let targetCompanyId = guestCompanyId;
  let targetTeamId = guestTeamId;
  let userInfo: any = null;

  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      targetCompanyId = user.companyId ? user.companyId.toString() : targetCompanyId;
      targetTeamId = user.teamId ? user.teamId.toString() : targetTeamId;
      userInfo = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyId: user.companyId,
        teamId: user.teamId,
      };
    }
  }

  if (!userInfo) {
    userInfo = {
      _id: 'guest',
      firstName: 'Guest',
      lastName: 'User',
      email: 'guest@actinc.com',
      companyId: targetCompanyId,
      teamId: targetTeamId,
    };
  }

  // Determine status filter: default to both published & draft so assigned modules always show
  const statusFilter =
    queryStatus === 'published'
      ? 'published'
      : { $in: ['published', 'draft'] };

  // Find modules assigned to user's team or company
  const filterQuery: any = { status: statusFilter, isDeleted: false };
  const orConditions: any[] = [];

  if (targetTeamId) {
    orConditions.push({ teamId: targetTeamId });
    if (Types.ObjectId.isValid(targetTeamId)) {
      orConditions.push({ teamId: new Types.ObjectId(targetTeamId) });
    }
  }
  if (targetCompanyId) {
    orConditions.push({ companyId: targetCompanyId });
    if (Types.ObjectId.isValid(targetCompanyId)) {
      orConditions.push({ companyId: new Types.ObjectId(targetCompanyId) });
    }

    // Also include modules assigned to any team under this company
    const companyTeams = await Team.find({ companyId: targetCompanyId }).select('_id').lean();
    if (companyTeams.length > 0) {
      const companyTeamIds = companyTeams.map((t) => t._id);
      orConditions.push({ teamId: { $in: companyTeamIds } });
    }
  }

  if (orConditions.length > 0) {
    filterQuery.$or = orConditions;
  } else {
    // If user has no company or team, return empty learning path
    return {
      overallStats: {
        totalModules: 0,
        completedModules: 0,
        inProgressModules: 0,
        notStartedModules: 0,
        overallProgressPercentage: 0,
        averageScore: 0,
      },
      user: userInfo,
      modules: [],
    };
  }

  const assignedModules = await Module.find(filterQuery).sort({ createdAt: -1 });

  // Get or initialize UserProgress for each module
  let completedCount = 0;
  let inProgressCount = 0;
  let totalScoreSum = 0;
  let scoredModulesCount = 0;
  let totalProgressSum = 0;

  const modulesWithProgress = await Promise.all(
    assignedModules.map(async (module) => {
      let progress: any = null;

      if (userId && userId !== 'guest') {
        progress = await UserProgress.findOne({ userId, moduleId: module._id });
      }

      if (!progress) {
        progress = {
          status: 'not_started',
          progressPercentage: 0,
          totalQuestions: module.questions ? module.questions.length : 0,
          completedQuestions: 0,
          score: 0,
        };
      }

      if (progress.status === 'completed') {
        completedCount++;
      } else if (progress.status === 'in_progress') {
        inProgressCount++;
      }

      totalProgressSum += progress.progressPercentage || 0;

      if (progress.score !== undefined && progress.score !== null) {
        totalScoreSum += progress.score;
        scoredModulesCount++;
      }

      return {
        _id: module._id,
        title: module.title,
        description: module.description,
        thumbnailImage: module.thumbnailImage,
        totalQuestions: module.questions ? module.questions.length : 0,
        status: module.status,
        userProgress: {
          status: progress.status,
          progressPercentage: progress.progressPercentage,
          completedQuestions: progress.completedQuestions,
          score: progress.score || 0,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
        },
      };
    }),
  );

  const totalModules = assignedModules.length;
  const overallProgressPercentage =
    totalModules > 0 ? Math.round(totalProgressSum / totalModules) : 0;
  const averageScore =
    scoredModulesCount > 0 ? Math.round(totalScoreSum / scoredModulesCount) : 0;

  return {
    overallStats: {
      totalModules,
      completedModules: completedCount,
      inProgressModules: inProgressCount,
      notStartedModules: totalModules - (completedCount + inProgressCount),
      overallProgressPercentage,
      averageScore,
    },
    user: userInfo,
    modules: modulesWithProgress,
  };
};

// ── Get Single Module for User ──
const getModuleForUserFromDB = async (
  userId?: string,
  moduleId?: string,
  guestCompanyId?: string,
  guestTeamId?: string,
) => {
  const module = await Module.findOne({ _id: moduleId, status: 'published', isDeleted: false });
  if (!module) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found or not published');
  }

  let progress: any = null;

  if (userId && userId !== 'guest') {
    progress = await UserProgress.findOne({ userId, moduleId });
    if (progress) {
      progress = progress.toObject();
      if (progress.score === undefined || progress.score === null) {
        progress.score = 0;
      }
    }
  }

  if (!progress) {
    progress = {
      userId: userId || 'guest',
      companyId: guestCompanyId || module.companyId,
      teamId: guestTeamId || module.teamId,
      moduleId: module._id,
      status: 'not_started',
      progressPercentage: 0,
      score: 0,
      totalQuestions: module.questions ? module.questions.length : 0,
      completedQuestions: 0,
      answers: [],
    };
  }

  return {
    module,
    userProgress: progress,
  };
};

// ── Submit Answer for a Question ──
// Graded questions can carry separate feedback for a wrong answer. Questions
// saved before that keep one feedback text, shown whatever the answer.
const feedbackForAnswer = (question: any, isCorrect: boolean): string => {
  if (
    !isCorrect &&
    question.isScored !== false &&
    typeof question.incorrectExplanation === 'string'
  ) {
    return question.incorrectExplanation;
  }
  return question.explanation || '';
};

const submitAnswerInDB = async (
  userId: string | undefined,
  payload: { moduleId: string; questionId: string; answer: any },
  guestCompanyId?: string,
  guestTeamId?: string,
) => {
  const { moduleId, questionId, answer } = payload;

  const module = await Module.findOne({ _id: moduleId, isDeleted: false });
  if (!module) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  const question: any = module.questions.find((q: any) => q.id === questionId);
  if (!question) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found in module');
  }

  // Check correctness & marking
  let isCorrect = false;
  let qScore = 0;

  if (question.type === 'MCQ') {
    if (
      question.correctAnswer &&
      String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
    ) {
      isCorrect = true;
      qScore = 100;
    }
  } else if (question.type === 'Swipe') {
    if (
      question.correctDirection &&
      String(answer).trim().toLowerCase() === String(question.correctDirection).trim().toLowerCase()
    ) {
      isCorrect = true;
      qScore = 100;
    } else if (!question.correctDirection) {
      isCorrect = true;
      qScore = 100;
    }
  } else if (question.type === 'Ordering') {
    if (
      Array.isArray(answer) &&
      Array.isArray(question.items) &&
      JSON.stringify(answer) === JSON.stringify(question.items)
    ) {
      isCorrect = true;
      qScore = 100;
    }
  } else if (question.type === 'Chat Scenario') {
    // ── New Branching Chat Scoring ──
    // answer format for branching: { stepId: string, optionId: string } OR array of such objects
    // answer format for legacy: string (matched against correctAnswer)
    if (question.chatSteps && question.chatSteps.length > 0 && typeof answer === 'object' && !Array.isArray(answer)) {
      // Single step answer: { stepId, optionId }
      const step: any = question.chatSteps.find((s: any) => s.stepId === answer.stepId);
      if (step) {
        const selectedOption: any = step.options?.find((o: any) => o.optionId === answer.optionId);
        if (selectedOption) {
          isCorrect = selectedOption.isCorrect === true;
          qScore = isCorrect ? 100 : 0;
        }
      }
    } else if (question.chatSteps && question.chatSteps.length > 0 && Array.isArray(answer)) {
      // Multi-step answers: [{ stepId, optionId }, ...] — score = average correctness
      let correctCount = 0;
      let totalScored = 0;
      for (const ans of answer) {
        const step: any = question.chatSteps.find((s: any) => s.stepId === ans.stepId);
        if (step) {
          const selectedOption: any = step.options?.find((o: any) => o.optionId === ans.optionId);
          if (selectedOption) {
            totalScored++;
            if (selectedOption.isCorrect === true) {
              correctCount++;
            }
          }
        }
      }
      if (totalScored > 0) {
        qScore = Math.round((correctCount / totalScored) * 100);
        isCorrect = correctCount === totalScored;
      } else {
        isCorrect = true;
        qScore = 100;
      }
    } else {
      // Legacy: flat correctAnswer matching
      if (
        question.correctAnswer &&
        String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
      ) {
        isCorrect = true;
        qScore = 100;
      } else if (!question.correctAnswer) {
        isCorrect = true;
        qScore = 100;
      }
    }
  } else {
    // Rating, Video, Free Input
    isCorrect = true;
    qScore = 100;
  }

  let progress: any = null;

  if (userId && userId !== 'guest') {
    progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      const user = await User.findById(userId);
      progress = new UserProgress({
        userId,
        companyId: user?.companyId || module.companyId,
        teamId: user?.teamId || module.teamId,
        moduleId,
        status: 'in_progress',
        score: 0,
        startedAt: new Date(),
        answers: [],
      });
    }

    if (!progress.answers) {
      progress.answers = [];
    }

    if (progress.status === 'not_started') {
      progress.status = 'in_progress';
      progress.startedAt = progress.startedAt || new Date();
    }
    progress.lastAttemptAt = new Date();

    // Update or push answer
    const existingAnswerIndex = progress.answers.findIndex((a: any) => a.questionId === questionId);
    const answerObj = {
      questionId,
      answer,
      isCorrect,
      score: qScore,
      answeredAt: new Date(),
    };

    if (existingAnswerIndex > -1) {
      progress.answers[existingAnswerIndex] = answerObj;
    } else {
      progress.answers.push(answerObj);
    }

    // Recalculate progress stats
    const totalQuestions = module.questions.length;
    const completedQuestions = progress.answers.length;
    const progressPercentage =
      totalQuestions > 0 ? Math.min(100, Math.round((completedQuestions / totalQuestions) * 100)) : 100;

    // Calculate score for scored questions
    const hasScoredQuestionsInModule = module.questions.some((q: any) => q.isScored !== false);
    const scoredAnswers = progress.answers.filter((a: any) => {
      const q: any = module.questions.find((qItem: any) => qItem.id === a.questionId);
      return q ? q.isScored !== false : true;
    });

    const avgScore = hasScoredQuestionsInModule
      ? (scoredAnswers.length > 0
          ? Math.round(
              scoredAnswers.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / scoredAnswers.length,
            )
          : 0)
      : null;

    progress.totalQuestions = totalQuestions;
    progress.completedQuestions = completedQuestions;
    progress.progressPercentage = progressPercentage;
    progress.score = avgScore;

    if (completedQuestions >= totalQuestions) {
      progress.status = 'completed';
      progress.completedAt = new Date();
    }

    await progress.save();

    return {
      questionId,
      isCorrect,
      score: qScore,
      correctAnswer: question.isScored !== false ? (question.correctAnswer || question.correctDirection) : undefined,
      explanation: feedbackForAnswer(question, isCorrect),
      completedQuestions,
      totalQuestions,
      progressPercentage,
      moduleScore: avgScore,
      moduleStatus: progress.status,
    };
  }

  // Transient response for anonymous guest users
  const hasScoredQuestionsInModule = module.questions.some((q: any) => q.isScored !== false);
  return {
    questionId,
    isCorrect,
    score: qScore,
    correctAnswer: question.isScored !== false ? (question.correctAnswer || question.correctDirection) : undefined,
    explanation: feedbackForAnswer(question, isCorrect),
    completedQuestions: 1,
    totalQuestions: module.questions.length,
    progressPercentage: Math.round((1 / module.questions.length) * 100),
    moduleScore: hasScoredQuestionsInModule ? qScore : null,
    moduleStatus: 'in_progress',
  };
};

// ── Complete Module ──
const completeModuleInDB = async (
  userId?: string,
  moduleId?: string,
  guestCompanyId?: string,
  guestTeamId?: string,
) => {
  const module = await Module.findOne({ _id: moduleId, isDeleted: false });
  if (!module) {
    throw new AppError(httpStatus.NOT_FOUND, 'Module not found');
  }

  const hasScoredQuestionsInModule = module.questions.some((q: any) => q.isScored !== false);

  if (userId && userId !== 'guest') {
    const user = await User.findById(userId);
    let progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      progress = new UserProgress({
        userId,
        companyId: user?.companyId || module.companyId,
        teamId: user?.teamId || module.teamId,
        moduleId,
        answers: [],
      });
    }

    progress.status = 'completed';
    progress.progressPercentage = 100;
    progress.completedQuestions = module.questions.length;
    progress.totalQuestions = module.questions.length;
    progress.completedAt = new Date();
    if (progress.score === undefined || progress.score === null) {
      progress.score = hasScoredQuestionsInModule ? 100 : null;
    }

    await progress.save();
    return progress;
  }

  return {
    userId: 'guest',
    companyId: guestCompanyId || module.companyId,
    teamId: guestTeamId || module.teamId,
    moduleId: module._id,
    status: 'completed',
    progressPercentage: 100,
    completedQuestions: module.questions.length,
    totalQuestions: module.questions.length,
    completedAt: new Date(),
    score: hasScoredQuestionsInModule ? 100 : null,
  };
};

// ── Team Performance Stats ──
const getTeamPerformanceFromDB = async (teamId: string) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError(httpStatus.NOT_FOUND, 'Team not found');
  }

  const teamUsers = await User.find({
    teamId,
    role: { $in: ['user', 'guest'] },
    isDeleted: false
  }).select(
    'firstName lastName email image role',
  );

  const teamUserIds = teamUsers.map((u) => u._id);
  const assignedModules = await Module.find({ teamId, isDeleted: false });

  const progressRecords = await UserProgress.find({
    userId: { $in: teamUserIds },
    teamId,
  });

  const totalMembers = teamUsers.length;
  const totalAssignedModules = assignedModules.length;

  let totalCompletedCount = 0;
  let totalScoreSum = 0;
  let scoredCount = 0;
  let totalProgressSum = 0;

  const memberBreakdown = teamUsers.map((user) => {
    const userProgresses = progressRecords.filter((p) => p.userId.equals(user._id));
    const userCompleted = userProgresses.filter((p) => p.status === 'completed').length;
    const userAvgProgress =
      totalAssignedModules > 0
        ? Math.round(
          userProgresses.reduce((sum, p) => sum + p.progressPercentage, 0) /
          totalAssignedModules,
        )
        : 0;

    const scored = userProgresses.filter((p) => p.score !== undefined && p.score !== null);
    const userAvgScore =
      scored.length > 0 ? Math.round(scored.reduce((sum, p) => sum + (p.score || 0), 0) / scored.length) : 0;

    totalCompletedCount += userCompleted;
    totalProgressSum += userAvgProgress;
    if (scored.length > 0) {
      totalScoreSum += userAvgScore;
      scoredCount++;
    }

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user.image,
      },
      completedModules: userCompleted,
      totalModules: totalAssignedModules,
      progressPercentage: userAvgProgress,
      averageScore: userAvgScore,
    };
  });

  const overallTeamProgress =
    totalMembers > 0 ? Math.round(totalProgressSum / totalMembers) : 0;
  const overallTeamScore = scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0;

  return {
    team: {
      _id: team._id,
      name: team.name,
      companyId: team.companyId,
    },
    stats: {
      totalMembers,
      totalAssignedModules,
      overallTeamProgressPercentage: overallTeamProgress,
      overallTeamAverageScore: overallTeamScore,
    },
    memberBreakdown,
  };
};

// ── Company Performance Stats ──
const getCompanyPerformanceFromDB = async (companyId: string) => {
  const company = await User.findOne({ _id: companyId, role: 'company' });
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  const teams = await Team.find({ companyId });
  const companyUsers = await User.find({
    companyId,
    role: { $in: ['user', 'guest'] },
    isDeleted: false
  });
  const companyUserIds = companyUsers.map((u) => u._id);

  const teamIds = teams.map((t) => t._id);
  const assignedModules = await Module.find({
    $or: [{ companyId }, { teamId: { $in: teamIds } }],
    isDeleted: false,
  });

  const progressRecords = await UserProgress.find({
    userId: { $in: companyUserIds },
    companyId,
  });

  let totalScoreSum = 0;
  let scoredCount = 0;
  let totalProgressSum = 0;

  const teamBreakdown = await Promise.all(
    teams.map(async (t) => {
      const tUsers = companyUsers.filter((u) => u.teamId && u.teamId.equals(t._id));
      const tUserIds = tUsers.map((u) => u._id);
      const tModules = assignedModules.filter((m) => m.teamId && m.teamId.equals(t._id));

      const tProgressRecords = progressRecords.filter((p) =>
        tUserIds.some((id) => id.equals(p.userId)),
      );

      const tCompleted = tProgressRecords.filter((p) => p.status === 'completed').length;
      const tTotalAssignments = tUsers.length * tModules.length;

      const tAvgProgress =
        tTotalAssignments > 0
          ? Math.round(
            (tProgressRecords.reduce((sum, p) => sum + p.progressPercentage, 0) /
              tTotalAssignments),
          )
          : 0;

      const scored = tProgressRecords.filter((p) => p.score !== undefined && p.score !== null);
      const tAvgScore =
        scored.length > 0 ? Math.round(scored.reduce((sum, p) => sum + (p.score || 0), 0) / scored.length) : 0;

      totalProgressSum += tAvgProgress;
      if (scored.length > 0) {
        totalScoreSum += tAvgScore;
        scoredCount++;
      }

      return {
        team: {
          _id: t._id,
          name: t.name,
        },
        totalMembers: tUsers.length,
        totalModules: tModules.length,
        completedAssignments: tCompleted,
        progressPercentage: tAvgProgress,
        averageScore: tAvgScore,
      };
    }),
  );

  const overallCompanyProgress =
    teams.length > 0 ? Math.round(totalProgressSum / teams.length) : 0;
  const overallCompanyScore = scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0;

  return {
    company: {
      _id: company._id,
      name: company.firstName || company.email,
    },
    stats: {
      totalTeams: teams.length,
      totalEmployees: companyUsers.length,
      totalAssignedModules: assignedModules.length,
      overallCompanyProgressPercentage: overallCompanyProgress,
      overallCompanyAverageScore: overallCompanyScore,
    },
    teamBreakdown,
  };
};

export const UserProgressServices = {
  getMyLearningPathFromDB,
  getModuleForUserFromDB,
  submitAnswerInDB,
  completeModuleInDB,
  getTeamPerformanceFromDB,
  getCompanyPerformanceFromDB,
};
