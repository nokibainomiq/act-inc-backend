import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Training, Topic } from './training.model';
import { Module } from '../Module/module.model';
import { UserProgress } from '../UserProgress/userProgress.model';
import { User } from '../User/user.model';
import QRCode from 'qrcode';
import config from '../../config';

// ── Create Training ──
const createTrainingInDB = async (payload: any, userId: string) => {
  payload.createdBy = userId;
  const result = await Training.create(payload);

  const baseUrl = config.frontend_url || config.server_url || 'http://localhost:3000';
  const joinUrl = `${baseUrl}/training/join/${result._id}?authType=${result.authType}`;
  const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);
  
  result.qrCodeUrl = qrCodeDataUrl;
  await result.save();

  return result;
};

// ── Get All Trainings (admin) ──
const getAllTrainingsFromDB = async (query: Record<string, unknown>) => {
  const trainingQuery = new QueryBuilder(
    Training.find({ isDeleted: false })
      .populate('createdBy', 'firstName lastName email')
      .populate('companyId', 'firstName email slug'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await trainingQuery.modelQuery;
  const meta = await trainingQuery.countTotal();

  // Attach topic and module counts for each training
  const trainingsWithTopics = await Promise.all(
    result.map(async (training: any) => {
      const topics = await Topic.find({
        trainingId: training._id,
        isDeleted: false,
      }).select('moduleIds');

      const allModuleIds = topics.reduce((acc: any[], t) => {
        if (Array.isArray(t.moduleIds)) {
          return acc.concat(t.moduleIds);
        }
        return acc;
      }, []);

      const validModules =
        allModuleIds.length > 0
          ? await Module.find({
              _id: { $in: allModuleIds },
              isDeleted: false,
            }).select('_id')
          : [];

      const validIdSet = new Set(validModules.map((m) => m._id.toString()));

      const totalModules = topics.reduce((sum, t) => {
        if (!Array.isArray(t.moduleIds)) return sum;
        return (
          sum +
          t.moduleIds.filter((id: any) => validIdSet.has(id.toString())).length
        );
      }, 0);

      const trainingObj = training.toObject ? training.toObject() : { ...training };
      return { ...trainingObj, topicCount: topics.length, totalModules };
    }),
  );

  return { result: trainingsWithTopics, meta };
};

// ── Get Single Training (full nested: training → topics → modules) ──
const getSingleTrainingFromDB = async (id: string, userId?: string) => {
  const training = await Training.findOne({ _id: id, isDeleted: false })
    .populate('createdBy', 'firstName lastName email')
    .populate('companyId', 'firstName email slug image branding');

  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  // Get all topics for this training, sorted by order
  const topics = await Topic.find({ trainingId: id, isDeleted: false })
    .sort({ order: 1 })
    .populate({
      path: 'moduleIds',
      select: 'title description thumbnailImage questions status isDeleted',
      match: { isDeleted: false },
    });

  const trainingObj = training.toObject();

  const topicsWithProgress = await Promise.all(
    topics.map(async (topic) => {
      const topicObj = topic.toObject();
      const rawModules = Array.isArray(topicObj.moduleIds) ? topicObj.moduleIds : [];
      const modules = rawModules.filter((mod: any) => mod && mod._id && !mod.isDeleted);

      const modulesWithProgress = await Promise.all(
        modules.map(async (mod: any) => {
          let userProgress: any = null;
          if (userId) {
            userProgress = await UserProgress.findOne({
              userId,
              moduleId: mod._id,
            }).select('status progressPercentage score completedQuestions totalQuestions');
          }

          return {
            _id: mod._id,
            title: mod.title,
            description: mod.description,
            thumbnailImage: mod.thumbnailImage,
            totalQuestions: mod.questions ? mod.questions.length : 0,
            status: mod.status,
            userProgress: userProgress
              ? {
                status: userProgress.status,
                progressPercentage: userProgress.progressPercentage,
                score: userProgress.score || 0,
                completedQuestions: userProgress.completedQuestions,
                totalQuestions: userProgress.totalQuestions,
              }
              : {
                status: 'not_started',
                progressPercentage: 0,
                score: 0,
                completedQuestions: 0,
                totalQuestions: mod.questions ? mod.questions.length : 0,
              },
          };
        })
      );

      return {
        ...topicObj,
        modules: modulesWithProgress,
        moduleIds: undefined,
        moduleCount: modulesWithProgress.length,
      };
    })
  );

  const totalModules = topicsWithProgress.reduce((sum, t) => sum + (t.moduleCount || 0), 0);

  return {
    ...trainingObj,
    totalModules,
    topicCount: topicsWithProgress.length,
    topics: topicsWithProgress,
  };
};

// ── Update Training ──
const updateTrainingInDB = async (id: string, payload: any) => {
  const training = await Training.findOne({ _id: id, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  if (payload.authType && payload.authType !== training.authType) {
    const baseUrl = config.frontend_url || config.server_url || 'http://localhost:3000';
    const joinUrl = `${baseUrl}/training/join/${training._id}?authType=${payload.authType}`;
    payload.qrCodeUrl = await QRCode.toDataURL(joinUrl);
  }

  const result = await Training.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'firstName lastName email');

  return result;
};

// ── Delete Training (soft delete) ──
const deleteTrainingFromDB = async (id: string) => {
  const training = await Training.findOne({ _id: id, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  await Training.findByIdAndUpdate(id, { isDeleted: true });
  // Also soft-delete all topics under this training
  await Topic.updateMany({ trainingId: id }, { isDeleted: true });

  return null;
};

// ── Duplicate Training (Deep Copy) ──
const duplicateTrainingInDB = async (trainingId: string, newTitle: string, userId: string) => {
  const original = await Training.findOne({ _id: trainingId, isDeleted: false }).lean();
  if (!original) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  // 1. Create new Training
  const duplicatedTraining = await Training.create({
    title: newTitle,
    description: original.description,
    thumbnailImage: original.thumbnailImage,
    authType: original.authType,
    passcode: original.passcode,
    companyId: original.companyId,
    teamId: original.teamId,
    status: 'draft',
    createdBy: userId,
  });

  const baseUrl = config.frontend_url || config.server_url || 'http://localhost:3000';
  const joinUrl = `${baseUrl}/training/join/${duplicatedTraining._id}?authType=${duplicatedTraining.authType}`;
  duplicatedTraining.qrCodeUrl = await QRCode.toDataURL(joinUrl);
  await duplicatedTraining.save();

  // 2. Fetch Topics
  const topics = await Topic.find({ trainingId, isDeleted: false }).sort({ order: 1 }).lean();

  // 3. Deep Copy Topics and Modules
  for (const topic of topics) {
    const duplicatedModuleIds = [];
    const modules = await Module.find({ _id: { $in: topic.moduleIds }, isDeleted: false }).lean();

    for (const mod of modules) {
      // Deep copy module
      const newModule = await Module.create({
        title: mod.title,
        description: mod.description,
        thumbnailImage: mod.thumbnailImage,
        questions: mod.questions.map((q: any) => {
          const { _id, ...rest } = q;
          return {
            ...rest,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          };
        }),
        status: 'draft',
        createdBy: userId,
        // Will set topicId after creating topic
      });
      duplicatedModuleIds.push(newModule._id);
    }

    // Create new Topic
    const newTopic = await Topic.create({
      title: topic.title,
      description: topic.description,
      trainingId: duplicatedTraining._id,
      moduleIds: duplicatedModuleIds,
      order: topic.order,
    });

    // Update the duplicated modules with the new topicId
    await Module.updateMany(
      { _id: { $in: duplicatedModuleIds } },
      { topicId: newTopic._id }
    );
  }

  return duplicatedTraining;
};

// ── Assign Training to Company/Team ──
const assignTrainingInDB = async (
  id: string,
  payload: { companyId: string; teamId?: string },
) => {
  const training = await Training.findOne({ _id: id, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  const updateData: any = {
    companyId: payload.companyId,
    status: 'published', // Automatically publish when assigned
  };
  if (payload.teamId) {
    updateData.teamId = payload.teamId;
  }

  const result = await Training.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'firstName lastName email')
    .populate('companyId', 'firstName email slug');

  // Find all topics to get module IDs
  const topics = await Topic.find({ trainingId: id, isDeleted: false });
  const allModuleIds = topics.reduce((acc: any[], topic) => {
    return acc.concat(topic.moduleIds || []);
  }, []);

  if (allModuleIds.length > 0) {
    // Publish and assign all child modules
    await Module.updateMany(
      { _id: { $in: allModuleIds } },
      {
        status: 'published',
        companyId: payload.companyId,
        ...(payload.teamId && { teamId: payload.teamId })
      }
    );
  }

  return result;
};

// ── Add Topic to Training ──
const addTopicToTrainingInDB = async (trainingId: string, payload: any) => {
  const training = await Training.findOne({ _id: trainingId, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  // Auto-assign order if not provided
  if (payload.order === undefined) {
    const lastTopic = await Topic.findOne({ trainingId, isDeleted: false }).sort({
      order: -1,
    });
    payload.order = lastTopic ? lastTopic.order + 1 : 0;
  }

  payload.trainingId = trainingId;
  const topic = await Topic.create(payload);
  return topic;
};

// ── Get Topics by Training ID ──
const getTopicsByTrainingIdFromDB = async (
  trainingId: string,
  userId?: string,
  userRole?: string,
) => {
  const training = await Training.findOne({ _id: trainingId, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  const isLearner = userRole === 'user' || userRole === 'guest';
  const matchCriteria: any = { isDeleted: false };
  if (isLearner) {
    matchCriteria.status = 'published';
  }

  const topics = await Topic.find({ trainingId, isDeleted: false })
    .sort({ order: 1 })
    .populate({
      path: 'moduleIds',
      select: 'title description thumbnailImage questions status isDeleted',
      match: matchCriteria,
    });

  const topicsWithProgress = await Promise.all(
    topics.map(async (topic) => {
      const topicObj = topic.toObject();
      const rawModules = Array.isArray(topicObj.moduleIds) ? topicObj.moduleIds : [];
      const modules = rawModules.filter(
        (mod: any) =>
          mod &&
          mod._id &&
          !mod.isDeleted &&
          (!isLearner || mod.status === 'published'),
      );

      const modulesWithProgress = await Promise.all(
        modules.map(async (mod: any) => {
          let userProgress: any = null;
          if (userId) {
            userProgress = await UserProgress.findOne({
              userId,
              moduleId: mod._id,
            }).select('status progressPercentage score completedQuestions totalQuestions');
          }

          return {
            _id: mod._id,
            title: mod.title,
            description: mod.description,
            thumbnailImage: mod.thumbnailImage,
            totalQuestions: mod.questions ? mod.questions.length : 0,
            status: mod.status,
            userProgress: userProgress
              ? {
                status: userProgress.status,
                progressPercentage: userProgress.progressPercentage,
                score: userProgress.score || 0,
                completedQuestions: userProgress.completedQuestions,
                totalQuestions: userProgress.totalQuestions,
              }
              : {
                status: 'not_started',
                progressPercentage: 0,
                score: 0,
                completedQuestions: 0,
                totalQuestions: mod.questions ? mod.questions.length : 0,
              },
          };
        })
      );

      return {
        ...topicObj,
        modules: modulesWithProgress,
        moduleIds: undefined,
        moduleCount: modulesWithProgress.length,
      };
    })
  );

  return topicsWithProgress;
};

// ── Get Single Topic ──
const getSingleTopicFromDB = async (
  trainingId: string,
  topicId: string,
  userId?: string,
  userRole?: string,
) => {
  const isLearner = userRole === 'user' || userRole === 'guest';
  const matchCriteria: any = { isDeleted: false };
  if (isLearner) {
    matchCriteria.status = 'published';
  }

  const topic = await Topic.findOne({
    _id: topicId,
    trainingId,
    isDeleted: false,
  }).populate({
    path: 'moduleIds',
    select: 'title description thumbnailImage questions status isDeleted',
    match: matchCriteria,
  });

  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Topic not found');
  }

  const topicObj = topic.toObject();
  const rawModules = Array.isArray(topicObj.moduleIds) ? topicObj.moduleIds : [];
  const modules = rawModules.filter(
    (mod: any) =>
      mod &&
      mod._id &&
      !mod.isDeleted &&
      (!isLearner || mod.status === 'published'),
  );

  const modulesWithProgress = await Promise.all(
    modules.map(async (mod: any) => {
      let userProgress: any = null;
      if (userId) {
        userProgress = await UserProgress.findOne({
          userId,
          moduleId: mod._id,
        }).select('status progressPercentage score completedQuestions totalQuestions');
      }

      return {
        _id: mod._id,
        title: mod.title,
        description: mod.description,
        thumbnailImage: mod.thumbnailImage,
        totalQuestions: mod.questions ? mod.questions.length : 0,
        status: mod.status,
        userProgress: userProgress
          ? {
            status: userProgress.status,
            progressPercentage: userProgress.progressPercentage,
            score: userProgress.score || 0,
            completedQuestions: userProgress.completedQuestions,
            totalQuestions: userProgress.totalQuestions,
          }
          : {
            status: 'not_started',
            progressPercentage: 0,
            score: 0,
            completedQuestions: 0,
            totalQuestions: mod.questions ? mod.questions.length : 0,
          },
      };
    })
  );

  return {
    ...topicObj,
    modules: modulesWithProgress,
    moduleIds: undefined,
    moduleCount: modulesWithProgress.length,
  };
};

// ── Update Topic ──
const updateTopicInDB = async (trainingId: string, topicId: string, payload: any) => {
  const topic = await Topic.findOne({
    _id: topicId,
    trainingId,
    isDeleted: false,
  });
  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Topic not found in this training');
  }

  const result = await Topic.findByIdAndUpdate(topicId, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

// ── Delete Topic from Training ──
const deleteTopicFromTrainingInDB = async (trainingId: string, topicId: string) => {
  const topic = await Topic.findOne({
    _id: topicId,
    trainingId,
    isDeleted: false,
  });
  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Topic not found in this training');
  }

  await Topic.findByIdAndUpdate(topicId, { isDeleted: true });
  return null;
};

// ── Add Module to Topic ──
const addModuleToTopicInDB = async (
  trainingId: string,
  topicId: string,
  moduleIds: string[],
) => {
  const topic = await Topic.findOne({
    _id: topicId,
    trainingId,
    isDeleted: false,
  });
  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Topic not found in this training');
  }

  const training = await Training.findOne({ _id: trainingId, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  const modules = await Module.find({ _id: { $in: moduleIds }, isDeleted: false });
  if (modules.length !== moduleIds.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'One or more modules not found');
  }

  const newModuleIds = [];

  for (const id of moduleIds) {
    // Avoid duplicate
    if (!topic.moduleIds.some((existingId) => existingId.toString() === id)) {
      topic.moduleIds.push(id as any);
      newModuleIds.push(id);
    }
  }

  await topic.save();

  // Update modules with topicId reference, and publish them if added to a training
  if (newModuleIds.length > 0) {
    const updatePayload: any = { 
      topicId, 
      status: 'published' 
    };
    if (training.companyId) {
      updatePayload.companyId = training.companyId;
    }
    if (training.teamId) {
      updatePayload.teamId = training.teamId;
    }

    await Module.updateMany(
      { _id: { $in: newModuleIds } },
      updatePayload
    );
  }

  return topic.populate('moduleIds', 'title description thumbnailImage status');
};

// ── Remove Module from Topic ──
const removeModuleFromTopicInDB = async (
  trainingId: string,
  topicId: string,
  moduleId: string,
) => {
  const topic = await Topic.findOne({
    _id: topicId,
    trainingId,
    isDeleted: false,
  });
  if (!topic) {
    throw new AppError(httpStatus.NOT_FOUND, 'Topic not found');
  }

  topic.moduleIds = topic.moduleIds.filter((id) => id.toString() !== moduleId);
  await topic.save();

  // Clear topicId from the module
  await Module.findByIdAndUpdate(moduleId, { $unset: { topicId: 1 } });

  return topic;
};

// ── Reorder Topics ──
const reorderTopicsInDB = async (trainingId: string, topicIds: string[]) => {
  const training = await Training.findOne({ _id: trainingId, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  await Promise.all(
    topicIds.map((topicId, index) =>
      Topic.findByIdAndUpdate(topicId, { order: index }),
    ),
  );

  const topics = await Topic.find({ trainingId, isDeleted: false }).sort({ order: 1 });
  return topics;
};

// ── Get Trainings by Company (company sees their assigned trainings) ──
const getTrainingsByCompanyFromDB = async (companyId: string) => {
  const trainings = await Training.find({
    companyId,
    isDeleted: false,
    status: 'published',
  })
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Attach topic + module counts
  const result = await Promise.all(
    trainings.map(async (training: any) => {
      const topics = await Topic.find({
        trainingId: training._id,
        isDeleted: false,
      })
        .sort({ order: 1 })
        .select('title moduleIds order');

      const allModuleIds = topics.reduce((acc: any[], t) => {
        if (Array.isArray(t.moduleIds)) {
          return acc.concat(t.moduleIds);
        }
        return acc;
      }, []);

      const publishedModules =
        allModuleIds.length > 0
          ? await Module.find({
              _id: { $in: allModuleIds },
              isDeleted: false,
              status: 'published',
            }).select('_id')
          : [];

      const publishedIdSet = new Set(publishedModules.map((m) => m._id.toString()));

      const totalModules = topics.reduce((sum, t) => {
        if (!Array.isArray(t.moduleIds)) return sum;
        return (
          sum +
          t.moduleIds.filter((id: any) => publishedIdSet.has(id.toString())).length
        );
      }, 0);

      const trainingObj = training.toObject();
      return {
        ...trainingObj,
        topicCount: topics.length,
        totalModules,
      };
    }),
  );

  return result;
};

// ── Get My Trainings (User/Guest) ──
const getMyTrainingsFromDB = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.companyId) {
    return [];
  }

  const query: any = {
    companyId: user.companyId,
    isDeleted: false,
    status: 'published',
  };

  // If the user belongs to a team, they should see trainings assigned to the whole company OR specifically to their team.
  if (user.teamId) {
    query.$or = [
      { teamId: user.teamId },
      { teamId: null },
      { teamId: { $exists: false } },
    ];
  }

  const trainings = await Training.find(query)
    .select('-qrCodeUrl -passcode')
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Attach topic + module counts
  const result = await Promise.all(
    trainings.map(async (training: any) => {
      const topics = await Topic.find({
        trainingId: training._id,
        isDeleted: false,
      })
        .sort({ order: 1 })
        .select('title moduleIds order');

      const allModuleIds = topics.reduce((acc: any[], t) => {
        if (Array.isArray(t.moduleIds)) {
          return acc.concat(t.moduleIds);
        }
        return acc;
      }, []);

      const publishedModules =
        allModuleIds.length > 0
          ? await Module.find({
              _id: { $in: allModuleIds },
              isDeleted: false,
              status: 'published',
            }).select('_id')
          : [];

      const publishedIdSet = new Set(publishedModules.map((m) => m._id.toString()));

      const totalModules = topics.reduce((sum, t) => {
        if (!Array.isArray(t.moduleIds)) return sum;
        return (
          sum +
          t.moduleIds.filter((id: any) => publishedIdSet.has(id.toString())).length
        );
      }, 0);

      const trainingObj = training.toObject();
      return {
        ...trainingObj,
        topicCount: topics.length,
        totalModules,
      };
    }),
  );

  return result;
};

// ── Get Training for User (public / with progress) ──
const getTrainingForUserFromDB = async (trainingId: string, userId?: string) => {
  const training = await Training.findOne({
    _id: trainingId,
    isDeleted: false,
    status: 'published',
  })
    .select('-qrCodeUrl -passcode')
    .populate('companyId', 'firstName email slug image branding');

  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found or not published');
  }

  const topics = await Topic.find({ trainingId, isDeleted: false })
    .sort({ order: 1 })
    .populate({
      path: 'moduleIds',
      select: 'title description thumbnailImage questions status isDeleted',
      match: { isDeleted: false, status: 'published' },
    });

  // Get user progress for each module if userId exists
  const topicsWithProgress = await Promise.all(
    topics.map(async (topic) => {
      const topicObj = topic.toObject();
      const rawModules = Array.isArray(topicObj.moduleIds) ? topicObj.moduleIds : [];
      const modules = rawModules.filter(
        (mod: any) => mod && mod._id && !mod.isDeleted && mod.status === 'published',
      );

      const modulesWithProgress = await Promise.all(
        modules.map(async (mod: any) => {
          let userProgress: any = null;
          if (userId) {
            userProgress = await UserProgress.findOne({
              userId,
              moduleId: mod._id,
            }).select('status progressPercentage score completedQuestions totalQuestions');
          }

          return {
            _id: mod._id,
            title: mod.title,
            description: mod.description,
            thumbnailImage: mod.thumbnailImage,
            totalQuestions: mod.questions ? mod.questions.length : 0,
            status: mod.status,
            userProgress: userProgress
              ? {
                status: userProgress.status,
                progressPercentage: userProgress.progressPercentage,
                score: userProgress.score || 0,
                completedQuestions: userProgress.completedQuestions,
                totalQuestions: userProgress.totalQuestions,
              }
              : {
                status: 'not_started',
                progressPercentage: 0,
                score: 0,
                completedQuestions: 0,
                totalQuestions: mod.questions ? mod.questions.length : 0,
              },
          };
        }),
      );

      return {
        _id: topicObj._id,
        title: topicObj.title,
        description: topicObj.description,
        order: topicObj.order,
        modules: modulesWithProgress,
        moduleCount: modulesWithProgress.length,
      };
    }),
  );

  const trainingObj = training.toObject();
  const totalModules = topicsWithProgress.reduce((sum, t) => sum + (t.moduleCount || 0), 0);

  return {
    ...trainingObj,
    totalModules,
    topicCount: topicsWithProgress.length,
    topics: topicsWithProgress,
  };
};

import { createToken } from '../Auth/auth.utils';

// ── Authenticate User for Training ──
const authenticateTrainingInDB = async (
  trainingId: string,
  payload: { authType: string; identifier?: string; name?: string; inviteToken?: string }
) => {
  const training = await Training.findOne({ _id: trainingId, isDeleted: false });
  if (!training) {
    throw new AppError(httpStatus.NOT_FOUND, 'Training not found');
  }

  let isInviteTokenValid = false;
  if (payload.inviteToken) {
    const { TrainingInvite } = await import('../TrainingInvite/trainingInvite.model');
    const invite = await TrainingInvite.findOne({ token: payload.inviteToken });
    if (!invite || invite.expiresAt < new Date()) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired invite token');
    }
    
    isInviteTokenValid = true;
  }

  if (training.authType !== payload.authType) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `This training requires ${training.authType} authentication`
    );
  }

  let user: any = null;

  if (payload.authType === 'email') {
    if (!payload.identifier) throw new AppError(httpStatus.BAD_REQUEST, 'Email is required');
    user = await User.findOne({ email: payload.identifier });
    if (!user) {
      user = await User.create({
        email: payload.identifier,
        firstName: payload.name || 'User',
        role: 'user',
        authType: 'email',
        companyId: training.companyId,
      });
    }

    // Tracking logic: ensure they have a TrainingInvite record so they show up in the dashboard
    const { TrainingInvite } = await import('../TrainingInvite/trainingInvite.model');
    let userInvite = await TrainingInvite.findOne({ trainingId: training._id, email: payload.identifier });
    
    if (userInvite) {
      userInvite.isUsed = true;
      await userInvite.save();
    } else {
      // Create a new invite record for this user so they appear in tracking
      const crypto = await import('crypto');
      await TrainingInvite.create({
        token: payload.inviteToken || crypto.randomBytes(32).toString('hex'),
        trainingId: training._id,
        companyId: training.companyId,
        email: payload.identifier,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isUsed: true,
        createdBy: user._id,
      });
    }
  } else if (payload.authType === 'employeeId') {
    if (!payload.identifier) throw new AppError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    user = await User.findOne({ employeeId: payload.identifier });
    if (!user) {
      user = await User.create({
        employeeId: payload.identifier,
        email: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@actinc.local`,
        firstName: payload.name || 'User',
        role: 'user',
        authType: 'employeeId',
        companyId: training.companyId,
      });
    }
  } else if (payload.authType === 'passcode') {
    if (payload.identifier !== training.passcode) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid passcode');
    }
    user = await User.create({
      firstName: payload.name || 'Guest',
      email: `passcode_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@actinc.local`,
      role: 'guest',
      authType: 'passcode',
      companyId: training.companyId,
    });
  } else if (payload.authType === 'guest') {
    // Guest doesn't need identifier
    user = await User.create({
      firstName: payload.name || 'Guest',
      email: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@actinc.local`,
      role: 'guest',
      authType: 'anonymous', // we can keep anonymous here as the User schema enum uses anonymous
      companyId: training.companyId,
    });
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid auth type');
  }

  // Generate JWT token
  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return { user, accessToken };
};

export const TrainingServices = {
  createTrainingInDB,
  getAllTrainingsFromDB,
  getSingleTrainingFromDB,
  updateTrainingInDB,
  deleteTrainingFromDB,
  duplicateTrainingInDB,
  assignTrainingInDB,
  getTopicsByTrainingIdFromDB,
  getSingleTopicFromDB,
  addTopicToTrainingInDB,
  updateTopicInDB,
  deleteTopicFromTrainingInDB,
  addModuleToTopicInDB,
  removeModuleFromTopicInDB,
  reorderTopicsInDB,
  getTrainingsByCompanyFromDB,
  getMyTrainingsFromDB,
  getTrainingForUserFromDB,
  authenticateTrainingInDB,
};
