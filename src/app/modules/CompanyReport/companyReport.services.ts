import { Types } from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { Team } from '../Team/team.model';
import { Module } from '../Module/module.model';
import { Training, Topic } from '../Training/training.model';
import { UserProgress } from '../UserProgress/userProgress.model';
import { TrainingInvite } from '../TrainingInvite/trainingInvite.model';

const DAY_MS = 24 * 60 * 60 * 1000;
// No activity for this long, with modules left to do, counts as inactive.
const INACTIVE_DAYS = 14;
// An average score below this on finished modules needs the owner's attention.
const LOW_SCORE = 55;
// Open answers only show a team name when the team is at least this big, so
// nobody can be recognised from a small team.
const MIN_GROUP_SIZE = 5;
// A gap between two answers longer than this is a break, not time spent.
const MAX_GAP_SECONDS = 15 * 60;
const TREND_WEEKS = 12;
const RICH_PREFIX = '__ACTINC_RICH_V1__:';

const AUTH_LABELS: Record<string, string> = {
  email: 'Email & password',
  employeeId: 'Employee ID',
  qr: 'QR code',
  passcode: 'Team passcode',
  anonymous: 'Anonymous',
  guest: 'Guest',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type CompanyData = Awaited<ReturnType<typeof loadCompanyData>>;

// ── Loading ──

const loadCompanyData = async (companyId: string) => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid company id');
  }

  const company = await User.findOne({ _id: companyId, role: 'company', isDeleted: false })
    .select('firstName createdAt')
    .lean();
  if (!company) throw new AppError(httpStatus.NOT_FOUND, 'Company not found');

  const teams = await Team.find({ companyId }).select('_id name').lean();
  const [learners, modules] = await Promise.all([
    User.find({ companyId, role: 'user', isDeleted: false })
      .select('_id firstName lastName fullName email employeeId authType teamId status lastActiveAt createdAt')
      .lean(),
    Module.find({
      $or: [{ companyId }, { teamId: { $in: teams.map((t) => t._id) } }],
      isDeleted: false,
      status: 'published',
    })
      .select('_id title questions topicId teamId createdAt')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const topics = await Topic.find({ _id: { $in: modules.map((m) => m.topicId).filter(Boolean) } })
    .select('_id title trainingId order')
    .lean();
  const trainings = await Training.find({ _id: { $in: topics.map((t) => t.trainingId) } })
    .select('_id title')
    .lean();
  const progress = await UserProgress.find({
    companyId,
    moduleId: { $in: modules.map((m) => m._id) },
    userId: { $in: learners.map((l) => l._id) },
  }).lean();

  const teamNames = new Map(teams.map((t) => [t._id.toString(), t.name]));
  const topicById = new Map(topics.map((t) => [t._id.toString(), t]));
  const trainingById = new Map(trainings.map((t) => [t._id.toString(), t]));
  const progressByUser = new Map<string, any[]>();
  const progressByModule = new Map<string, any[]>();
  for (const p of progress) {
    const userKey = p.userId.toString();
    const moduleKey = p.moduleId.toString();
    progressByUser.set(userKey, [...(progressByUser.get(userKey) || []), p]);
    progressByModule.set(moduleKey, [...(progressByModule.get(moduleKey) || []), p]);
  }
  const teamSizes = new Map<string, number>();
  for (const l of learners) {
    const key = l.teamId?.toString();
    if (key) teamSizes.set(key, (teamSizes.get(key) || 0) + 1);
  }

  return {
    company,
    teams,
    learners,
    modules,
    topicById,
    trainingById,
    teamNames,
    teamSizes,
    progressByUser,
    progressByModule,
  };
};

// ── Small helpers ──

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// QR and employee-ID logins get a made-up "...@qr.local" address; that isn't worth showing.
const realEmail = (l: any) => (l.email && !String(l.email).endsWith('.local') ? l.email : null);

const learnerName = (l: any) =>
  l.fullName || [l.firstName, l.lastName].filter(Boolean).join(' ') || l.employeeId || 'Learner';

const plainText = (value?: string) => {
  if (!value) return '';
  if (!value.startsWith(RICH_PREFIX)) return value.trim();
  const collect = (node: any): string =>
    node?.type === 'text'
      ? node.text || ''
      : (node?.content || []).map(collect).join(node?.type === 'doc' ? ' ' : '');
  try {
    return collect(JSON.parse(value.slice(RICH_PREFIX.length))).replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

const questionTitle = (q: any, index: number) => {
  const text = plainText(q.content) || q.callerName || `${q.type} question`;
  return `${index + 1}. ${text.length > 120 ? `${text.slice(0, 117)}...` : text}`;
};

const startOfWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
};

const weekStarts = (now: Date) => {
  const current = startOfWeek(now);
  return Array.from({ length: TREND_WEEKS }, (_, i) => new Date(current.getTime() - (TREND_WEEKS - 1 - i) * 7 * DAY_MS));
};

const isStarted = (p: any) => p.status === 'completed' || (p.answers?.length || 0) > 0;

// Seconds spent on one module: the app's own timing where it was sent,
// otherwise the gaps between answers (breaks left out).
const timeSpentSeconds = (p: any) => {
  const answers = [...(p.answers || [])].sort(
    (a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime(),
  );
  let previous = p.startedAt ? new Date(p.startedAt).getTime() : null;
  let total = 0;
  for (const a of answers) {
    const at = new Date(a.answeredAt).getTime();
    if (typeof a.timeSpentSeconds === 'number') {
      total += a.timeSpentSeconds;
    } else if (previous !== null && at > previous) {
      total += Math.min((at - previous) / 1000, MAX_GAP_SECONDS);
    }
    previous = at;
  }
  return total;
};

const lastActivity = (l: any, progress: any[]) => {
  const times = [
    l.lastActiveAt ? new Date(l.lastActiveAt).getTime() : 0,
    ...progress.map((p) => (p.lastAttemptAt ? new Date(p.lastAttemptAt).getTime() : 0)),
  ];
  const latest = Math.max(...times);
  return latest > 0 ? new Date(latest) : null;
};

// A question has a right answer the report can compare against.
const isGradable = (q: any) => {
  if (q.isScored === false) return false;
  if (q.type === 'MCQ') return Boolean(q.correctAnswer);
  if (q.type === 'Swipe') return Boolean(q.correctDirection);
  if (q.type === 'Ordering') return Array.isArray(q.items) && q.items.length > 1;
  if (q.type === 'Chat Scenario') {
    return (
      (q.chatSteps || []).some((s: any) => (s.options || []).some((o: any) => o.isCorrect)) ||
      Boolean(q.correctAnswer)
    );
  }
  if (q.type === 'Video') return Boolean(q.correctAnswer);
  return false;
};

// ── Per-learner and per-group summaries ──

const summarizeLearner = (data: CompanyData, l: any, now: Date) => {
  const progress = data.progressByUser.get(l._id.toString()) || [];
  const started = progress.filter(isStarted);
  const completed = progress.filter((p) => p.status === 'completed');
  const scores = completed.map((p) => p.score).filter((s) => typeof s === 'number');
  const assigned = data.modules.length;
  const lastActiveAt = lastActivity(l, progress);
  const averageScore = average(scores);
  const hasWorkLeft = completed.length < assigned;
  const inactive =
    hasWorkLeft && (!lastActiveAt || now.getTime() - lastActiveAt.getTime() > INACTIVE_DAYS * DAY_MS);
  const lowScore = averageScore !== null && averageScore < LOW_SCORE;

  return {
    userId: l._id.toString(),
    name: learnerName(l),
    email: realEmail(l),
    employeeId: l.employeeId || null,
    authType: l.authType || 'email',
    teamId: l.teamId?.toString() || null,
    teamName: (l.teamId && data.teamNames.get(l.teamId.toString())) || 'No team',
    accountStatus: l.status || 'active',
    joinedAt: l.createdAt || null,
    assigned,
    started: started.length,
    completed: completed.length,
    progressPercentage: percent(completed.length, assigned),
    averageScore: averageScore === null ? null : Math.round(averageScore),
    timeSpentMinutes: Math.round(progress.reduce((sum, p) => sum + timeSpentSeconds(p), 0) / 60),
    retakes: progress.reduce((sum, p) => sum + (p.attempts?.length || 0), 0),
    lastActiveAt,
    flags: {
      inactive,
      lowScore,
      notStarted: started.length === 0 && assigned > 0,
      needsAttention: inactive || lowScore,
    },
  };
};

type LearnerSummary = ReturnType<typeof summarizeLearner>;

const summarizeGroup = (rows: LearnerSummary[], now: Date) => {
  const assigned = rows.reduce((sum, r) => sum + r.assigned, 0);
  const completed = rows.reduce((sum, r) => sum + r.completed, 0);
  const scores = rows.map((r) => r.averageScore).filter((s): s is number => s !== null);
  const activeLast30 = rows.filter(
    (r) => r.lastActiveAt && now.getTime() - r.lastActiveAt.getTime() <= 30 * DAY_MS,
  ).length;
  const finishedMinutes = rows.reduce((sum, r) => sum + r.timeSpentMinutes, 0);

  return {
    learners: rows.length,
    activeLast30,
    activeRate: percent(activeLast30, rows.length),
    started: rows.reduce((sum, r) => sum + r.started, 0),
    completed,
    completionRate: percent(completed, assigned),
    averageScore: scores.length > 0 ? Math.round(average(scores)!) : null,
    averageTimeMinutes: completed > 0 ? Math.round(finishedMinutes / completed) : null,
    needsAttention: rows.filter((r) => r.flags.needsAttention).length,
  };
};

const summarizeModule = (data: CompanyData, m: any, learnerIds?: Set<string>) => {
  const progress = (data.progressByModule.get(m._id.toString()) || []).filter(
    (p) => !learnerIds || learnerIds.has(p.userId.toString()),
  );
  const assigned = learnerIds ? learnerIds.size : data.learners.length;
  const started = progress.filter(isStarted);
  const completed = progress.filter((p) => p.status === 'completed');
  const scores = completed.map((p) => p.score).filter((s) => typeof s === 'number');
  const times = completed.map(timeSpentSeconds).filter((t) => t > 0);

  // Where unfinished learners stopped: the first question they haven't answered.
  const stops = new Map<number, number>();
  for (const p of started.filter((sp) => sp.status !== 'completed')) {
    const answered = new Set((p.answers || []).map((a: any) => a.questionId));
    const next = (m.questions || []).findIndex((q: any) => !answered.has(q.id));
    if (next >= 0) stops.set(next, (stops.get(next) || 0) + 1);
  }
  const [dropIndex, dropCount] = [...stops.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  const topic = m.topicId ? data.topicById.get(m.topicId.toString()) : undefined;
  const training = topic ? data.trainingById.get(topic.trainingId.toString()) : undefined;
  const retaken = progress.filter((p) => (p.attempts?.length || 0) > 0);

  return {
    moduleId: m._id.toString(),
    title: m.title,
    topicId: topic?._id.toString() || null,
    topicTitle: topic?.title || null,
    trainingId: training?._id.toString() || null,
    trainingTitle: training?.title || null,
    teamName: m.teamId ? data.teamNames.get(m.teamId.toString()) || null : null,
    questions: (m.questions || []).length,
    assigned,
    started: started.length,
    completed: completed.length,
    completionRate: percent(completed.length, assigned),
    averageScore: scores.length > 0 ? Math.round(average(scores)!) : null,
    averageTimeMinutes: times.length > 0 ? round(average(times)! / 60, 1) : null,
    dropOff:
      dropIndex !== undefined
        ? { questionIndex: dropIndex, title: questionTitle(m.questions[dropIndex], dropIndex), learners: dropCount }
        : null,
    retakes: retaken.length,
    firstAttemptScore: retaken.length
      ? Math.round(average(retaken.map((p) => p.attempts[0].score ?? 0))!)
      : null,
    latestScore: retaken.length ? Math.round(average(retaken.map((p) => p.score ?? 0))!) : null,
  };
};

// ── Reports ──

const getOverview = async (companyId: string) => {
  const data = await loadCompanyData(companyId);
  const now = new Date();
  const rows = data.learners.map((l) => summarizeLearner(data, l, now));
  const group = summarizeGroup(rows, now);
  const activeWithin = (days: number) =>
    rows.filter((r) => r.lastActiveAt && now.getTime() - r.lastActiveAt.getTime() <= days * DAY_MS).length;

  const weeks = weekStarts(now);
  const weekIndex = (date: Date) => {
    const start = startOfWeek(date).getTime();
    return weeks.findIndex((w) => w.getTime() === start);
  };
  const completions = weeks.map(() => 0);
  const activeSets = weeks.map(() => new Set<string>());
  for (const list of data.progressByUser.values()) {
    for (const p of list) {
      if (p.completedAt) {
        const i = weekIndex(new Date(p.completedAt));
        if (i >= 0) completions[i]++;
      }
      for (const a of p.answers || []) {
        const i = weekIndex(new Date(a.answeredAt));
        if (i >= 0) activeSets[i].add(p.userId.toString());
      }
    }
  }

  const teamRows = data.teams
    .map((t) => {
      const members = rows.filter((r) => r.teamId === t._id.toString());
      return { teamId: t._id.toString(), name: t.name, ...summarizeGroup(members, now) };
    })
    .filter((t) => t.learners > 0);

  const allProgress = [...data.progressByUser.values()].flat();
  const retaken = allProgress.filter((p) => (p.attempts?.length || 0) > 0);

  return {
    company: { name: data.company.firstName, memberSince: data.company.createdAt },
    totals: {
      learners: rows.length,
      teams: data.teams.length,
      modules: data.modules.length,
      activeLast7: activeWithin(7),
      activeLast30: activeWithin(30),
      neverStarted: rows.filter((r) => r.flags.notStarted).length,
    },
    funnel: {
      assigned: rows.length * data.modules.length,
      started: group.started,
      completed: group.completed,
    },
    completionRate: group.completionRate,
    averageScore: group.averageScore,
    averageTimeMinutes: group.averageTimeMinutes,
    trend: weeks.map((w, i) => ({
      weekStart: w,
      completions: completions[i],
      activeLearners: activeSets[i].size,
    })),
    attention: {
      inactive: rows.filter((r) => r.flags.inactive).length,
      lowScore: rows.filter((r) => r.flags.lowScore).length,
      learners: rows
        .filter((r) => r.flags.needsAttention)
        .sort((a, b) => (a.lastActiveAt?.getTime() || 0) - (b.lastActiveAt?.getTime() || 0))
        .slice(0, 6)
        .map((r) => ({
          userId: r.userId,
          name: r.name,
          teamName: r.teamName,
          lastActiveAt: r.lastActiveAt,
          progressPercentage: r.progressPercentage,
          averageScore: r.averageScore,
          reason: r.flags.inactive ? 'inactive' : 'lowScore',
        })),
    },
    weakestTeams: [...teamRows].sort((a, b) => a.completionRate - b.completionRate).slice(0, 3),
    improvement: {
      retakes: retaken.length,
      firstAttemptScore: retaken.length ? Math.round(average(retaken.map((p) => p.attempts[0].score ?? 0))!) : null,
      latestScore: retaken.length ? Math.round(average(retaken.map((p) => p.score ?? 0))!) : null,
    },
  };
};

const teamMatrix = (data: CompanyData, groups: { id: string | null; name: string; ids: Set<string> }[]) => ({
  modules: data.modules.map((m) => ({ moduleId: m._id.toString(), title: m.title })),
  rows: groups.map((g) => ({
    teamId: g.id,
    name: g.name,
    cells: data.modules.map((m) => {
      const s = summarizeModule(data, m, g.ids);
      return { moduleId: s.moduleId, completionRate: s.completionRate, averageScore: s.averageScore };
    }),
  })),
});

const getTeams = async (companyId: string) => {
  const data = await loadCompanyData(companyId);
  const now = new Date();
  const rows = data.learners.map((l) => summarizeLearner(data, l, now));

  const groups = data.teams.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    ids: new Set(rows.filter((r) => r.teamId === t._id.toString()).map((r) => r.userId)),
  }));
  const withoutTeam = rows.filter((r) => !r.teamId || !data.teamNames.has(r.teamId));
  if (withoutTeam.length > 0) {
    groups.push({ id: null as any, name: 'No team', ids: new Set(withoutTeam.map((r) => r.userId)) });
  }

  return {
    teams: groups.map((g) => ({
      teamId: g.id,
      name: g.name,
      ...summarizeGroup(rows.filter((r) => g.ids.has(r.userId)), now),
    })),
    matrix: teamMatrix(data, groups),
  };
};

const getTeamDetail = async (companyId: string, teamId: string) => {
  const data = await loadCompanyData(companyId);
  const team = data.teams.find((t) => t._id.toString() === teamId);
  if (!team) throw new AppError(httpStatus.NOT_FOUND, 'Team not found');

  const now = new Date();
  const members = data.learners
    .filter((l) => l.teamId?.toString() === teamId)
    .map((l) => summarizeLearner(data, l, now));
  const ids = new Set(members.map((m) => m.userId));

  return {
    team: { teamId, name: team.name },
    summary: summarizeGroup(members, now),
    members: members.sort((a, b) => b.progressPercentage - a.progressPercentage),
    modules: data.modules.map((m) => summarizeModule(data, m, ids)),
  };
};

const getLearners = async (companyId: string, query: Record<string, unknown>) => {
  const data = await loadCompanyData(companyId);
  const now = new Date();
  const search = String(query.searchTerm || '').trim().toLowerCase();
  const filter = String(query.filter || 'all');
  const teamId = query.teamId ? String(query.teamId) : '';

  let rows = data.learners.map((l) => summarizeLearner(data, l, now));
  if (teamId) rows = rows.filter((r) => (teamId === 'none' ? !r.teamId : r.teamId === teamId));
  if (search) {
    rows = rows.filter((r) =>
      [r.name, r.email, r.employeeId, r.teamName].some((v) => v?.toLowerCase().includes(search)),
    );
  }
  if (filter === 'attention') rows = rows.filter((r) => r.flags.needsAttention);
  if (filter === 'inactive') rows = rows.filter((r) => r.flags.inactive);
  if (filter === 'low_score') rows = rows.filter((r) => r.flags.lowScore);
  if (filter === 'not_started') rows = rows.filter((r) => r.flags.notStarted);
  if (filter === 'finished') rows = rows.filter((r) => r.assigned > 0 && r.completed === r.assigned);

  const sorters: Record<string, (a: LearnerSummary, b: LearnerSummary) => number> = {
    progress: (a, b) => b.progressPercentage - a.progressPercentage,
    score: (a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1),
    lastActive: (a, b) => (b.lastActiveAt?.getTime() || 0) - (a.lastActiveAt?.getTime() || 0),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  rows.sort(sorters[String(query.sort)] || sorters.name);

  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  return {
    meta: { page, limit, total: rows.length, totalPage: Math.max(Math.ceil(rows.length / limit), 1) },
    result: rows.slice((page - 1) * limit, page * limit),
    teams: data.teams.map((t) => ({ teamId: t._id.toString(), name: t.name })),
  };
};

const getLearnerDetail = async (companyId: string, userId: string) => {
  const data = await loadCompanyData(companyId);
  const learner = data.learners.find((l) => l._id.toString() === userId);
  if (!learner) throw new AppError(httpStatus.NOT_FOUND, 'Learner not found');

  const now = new Date();
  const progress = data.progressByUser.get(userId) || [];
  const byModule = new Map(progress.map((p) => [p.moduleId.toString(), p]));

  const modules = data.modules.map((m) => {
    const p = byModule.get(m._id.toString());
    const topic = m.topicId ? data.topicById.get(m.topicId.toString()) : undefined;
    const gradable = (m.questions || []).filter(isGradable);
    const gradableIds = new Set(gradable.map((q: any) => q.id));
    const graded = (p?.answers || []).filter((a: any) => gradableIds.has(a.questionId));
    return {
      moduleId: m._id.toString(),
      title: m.title,
      topicTitle: topic?.title || null,
      trainingTitle: topic ? data.trainingById.get(topic.trainingId.toString())?.title || null : null,
      status: p ? (p.status === 'completed' ? 'completed' : isStarted(p) ? 'in_progress' : 'not_started') : 'not_started',
      progressPercentage: p?.progressPercentage || 0,
      score: p && typeof p.score === 'number' ? p.score : null,
      answered: p?.answers?.length || 0,
      totalQuestions: (m.questions || []).length,
      correctAnswers: graded.filter((a: any) => a.isCorrect).length,
      gradedAnswers: graded.length,
      startedAt: p?.startedAt || null,
      completedAt: p?.completedAt || null,
      timeSpentMinutes: p ? Math.round(timeSpentSeconds(p) / 60) : 0,
      attempts: (p?.attempts || []).map((a: any) => ({ score: a.score ?? null, completedAt: a.completedAt || null })),
    };
  });

  // Answers per day over the last 30 days.
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * DAY_MS);
    return d.toISOString().slice(0, 10);
  });
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const p of progress) {
    for (const a of p.answers || []) {
      const key = new Date(a.answeredAt).toISOString().slice(0, 10);
      if (perDay.has(key)) perDay.set(key, (perDay.get(key) || 0) + 1);
    }
  }

  return {
    learner: summarizeLearner(data, learner, now),
    modules,
    activity: days.map((date) => ({ date, answers: perDay.get(date) || 0 })),
  };
};

const getModules = async (companyId: string) => {
  const data = await loadCompanyData(companyId);
  const rows = data.modules.map((m) => summarizeModule(data, m));

  // Group by training, then topic, in the order the trainings were built.
  const trainings = new Map<string, { trainingId: string | null; title: string; topics: Map<string, any> }>();
  for (const row of rows) {
    const trainingKey = row.trainingId || 'none';
    if (!trainings.has(trainingKey)) {
      trainings.set(trainingKey, {
        trainingId: row.trainingId,
        title: row.trainingTitle || 'Other modules',
        topics: new Map(),
      });
    }
    const training = trainings.get(trainingKey)!;
    const topicKey = row.topicId || 'none';
    if (!training.topics.has(topicKey)) {
      training.topics.set(topicKey, { topicId: row.topicId, title: row.topicTitle || 'Without topic', modules: [] });
    }
    training.topics.get(topicKey).modules.push(row);
  }

  return {
    trainings: [...trainings.values()].map((t) => ({
      trainingId: t.trainingId,
      title: t.title,
      topics: [...t.topics.values()],
    })),
  };
};

const answerLabel = (q: any, answer: any): string => {
  if (q.type === 'Swipe') {
    const dir = String(answer).toLowerCase();
    return dir === 'left' ? q.leftLabel || 'Left' : dir === 'right' ? q.rightLabel || 'Right' : String(answer);
  }
  if (Array.isArray(answer)) return answer.map(String).join(' → ');
  if (answer && typeof answer === 'object') return JSON.stringify(answer);
  return String(answer ?? '');
};

const isCorrectLabel = (q: any, label: string) => {
  if (q.type === 'MCQ' || q.type === 'Video') {
    return String(q.correctAnswer || '').trim().toLowerCase() === label.trim().toLowerCase();
  }
  if (q.type === 'Swipe') return label === (q.correctDirection === 'left' ? q.leftLabel || 'Left' : q.rightLabel || 'Right');
  if (q.type === 'Ordering') return label === (q.items || []).join(' → ');
  return false;
};

const getModuleDetail = async (companyId: string, moduleId: string) => {
  const data = await loadCompanyData(companyId);
  const m = data.modules.find((mod) => mod._id.toString() === moduleId);
  if (!m) throw new AppError(httpStatus.NOT_FOUND, 'Module not found');

  const progress = data.progressByModule.get(moduleId) || [];
  const learnerTeam = new Map(data.learners.map((l) => [l._id.toString(), l.teamId?.toString()]));

  const questions = (m.questions || []).map((q: any, index: number) => {
    const answers = progress
      .map((p) => ({ p, a: (p.answers || []).find((a: any) => a.questionId === q.id) }))
      .filter((x) => x.a);
    const times = answers.map((x) => x.a.timeSpentSeconds).filter((t: any) => typeof t === 'number');
    const gradable = isGradable(q);
    const base: any = {
      questionId: q.id,
      index,
      type: q.type,
      title: questionTitle(q, index),
      answered: answers.length,
      averageTimeSeconds: times.length ? Math.round(average(times)!) : null,
      gradable,
      correctRate: gradable ? percent(answers.filter((x) => x.a.isCorrect).length, answers.length) : null,
    };

    if (['MCQ', 'Swipe', 'Ordering', 'Video'].includes(q.type)) {
      const counts = new Map<string, number>();
      for (const { a } of answers) {
        const label = answerLabel(q, a.answer);
        if (label && label !== 'completed') counts.set(label, (counts.get(label) || 0) + 1);
      }
      const total = [...counts.values()].reduce((sum, c) => sum + c, 0);
      base.distribution = [...counts.entries()]
        .map(([label, count]) => ({
          label,
          count,
          percentage: percent(count, total),
          isCorrect: gradable ? isCorrectLabel(q, label) : null,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      const wrong = base.distribution.find((d: any) => d.isCorrect === false);
      base.mostChosenWrong = gradable && wrong ? { label: wrong.label, count: wrong.count } : null;
    }

    if (q.type === 'Video') {
      const watched = answers.map((x) => x.a.watchedPercent).filter((w: any) => typeof w === 'number');
      base.averageWatchedPercent = watched.length ? Math.round(average(watched)!) : null;
    }

    if (q.type === 'Rating') {
      const scale = q.scale || 5;
      const values = answers.map((x) => Number(x.a.answer)).filter((v) => Number.isFinite(v));
      base.rating = {
        scale,
        average: values.length ? round(average(values)!, 1) : null,
        distribution: Array.from({ length: scale }, (_, i) => ({
          value: i + 1,
          count: values.filter((v) => v === i + 1).length,
        })),
      };
    }

    if (q.type === 'Free Input') {
      base.openAnswers = answers
        .map(({ p, a }) => {
          const teamId = learnerTeam.get(p.userId.toString());
          const showTeam = teamId && (data.teamSizes.get(teamId) || 0) >= MIN_GROUP_SIZE;
          return {
            text: String(a.answer ?? '').trim(),
            teamName: showTeam ? data.teamNames.get(teamId) || null : null,
            answeredAt: a.answeredAt,
          };
        })
        .filter((x) => x.text)
        .sort((x, y) => new Date(y.answeredAt).getTime() - new Date(x.answeredAt).getTime());
    }

    if (q.type === 'Chat Scenario' && (q.chatSteps || []).length > 0) {
      const picks = new Map<string, number>();
      for (const { a } of answers) {
        const list = Array.isArray(a.answer) ? a.answer : a.answer && typeof a.answer === 'object' ? [a.answer] : [];
        for (const pick of list) {
          const key = `${pick.stepId}::${pick.optionId}`;
          picks.set(key, (picks.get(key) || 0) + 1);
        }
      }
      base.chatSteps = q.chatSteps
        .map((s: any) => {
          const options = (s.options || []).map((o: any) => ({
            text: o.text || 'Option',
            isCorrect: Boolean(o.isCorrect),
            count: picks.get(`${s.stepId}::${o.optionId}`) || 0,
          }));
          const total = options.reduce((sum: number, o: any) => sum + o.count, 0);
          const lastMessage = [...(s.messages || [])].reverse().find((msg: any) => !msg.isUser);
          return {
            stepId: s.stepId,
            prompt: lastMessage?.text || '',
            reached: total,
            options: options.map((o: any) => ({ ...o, percentage: percent(o.count, total) })),
          };
        })
        .filter((s: any) => s.options.length > 0);
    }

    return base;
  });

  return { module: summarizeModule(data, m), questions };
};

const getAccess = async (companyId: string) => {
  const data = await loadCompanyData(companyId);
  const now = new Date();
  const invites = await TrainingInvite.find({ companyId }).select('trainingId isUsed expiresAt createdAt').lean();
  const trainingTitles = new Map(
    (await Training.find({ _id: { $in: invites.map((i) => i.trainingId) } }).select('_id title').lean()).map((t) => [
      t._id.toString(),
      t.title,
    ]),
  );

  const byTraining = new Map<string, { trainingId: string; title: string; sent: number; used: number }>();
  for (const invite of invites) {
    const key = invite.trainingId.toString();
    const row = byTraining.get(key) || { trainingId: key, title: trainingTitles.get(key) || 'Training', sent: 0, used: 0 };
    row.sent++;
    if (invite.isUsed) row.used++;
    byTraining.set(key, row);
  }

  const methods = new Map<string, number>();
  for (const l of data.learners) methods.set(l.authType || 'email', (methods.get(l.authType || 'email') || 0) + 1);

  const weeks = weekStarts(now);
  return {
    learners: data.learners.length,
    invites: {
      total: invites.length,
      used: invites.filter((i) => i.isUsed).length,
      pending: invites.filter((i) => !i.isUsed && new Date(i.expiresAt) > now).length,
      expired: invites.filter((i) => !i.isUsed && new Date(i.expiresAt) <= now).length,
      byTraining: [...byTraining.values()].sort((a, b) => b.sent - a.sent),
    },
    loginMethods: [...methods.entries()]
      .map(([authType, learners]) => ({ authType, label: AUTH_LABELS[authType] || authType, learners }))
      .sort((a, b) => b.learners - a.learners),
    newLearners: weeks.map((w) => ({
      weekStart: w,
      count: data.learners.filter(
        (l) => l.createdAt && startOfWeek(new Date(l.createdAt)).getTime() === w.getTime(),
      ).length,
    })),
  };
};

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// One row per learner and module. Semicolons, because Dutch Excel opens those as columns.
const exportProgressCsv = async (companyId: string) => {
  const data = await loadCompanyData(companyId);
  const header = [
    'Learner', 'Email', 'Employee ID', 'Team', 'Training', 'Topic', 'Module', 'Status',
    'Progress %', 'Score %', 'Started', 'Completed', 'Minutes spent', 'Earlier attempts',
  ];
  const lines = [header.map(csvCell).join(';')];

  for (const l of data.learners) {
    const byModule = new Map((data.progressByUser.get(l._id.toString()) || []).map((p) => [p.moduleId.toString(), p]));
    for (const m of data.modules) {
      const p = byModule.get(m._id.toString());
      const topic = m.topicId ? data.topicById.get(m.topicId.toString()) : undefined;
      const status = p ? (p.status === 'completed' ? 'Completed' : isStarted(p) ? 'In progress' : 'Not started') : 'Not started';
      lines.push(
        [
          learnerName(l),
          realEmail(l) || '',
          l.employeeId || '',
          (l.teamId && data.teamNames.get(l.teamId.toString())) || '',
          topic ? data.trainingById.get(topic.trainingId.toString())?.title || '' : '',
          topic?.title || '',
          m.title,
          status,
          p?.progressPercentage ?? 0,
          p && typeof p.score === 'number' ? p.score : '',
          p?.startedAt ? new Date(p.startedAt) : '',
          p?.completedAt ? new Date(p.completedAt) : '',
          p ? Math.round(timeSpentSeconds(p) / 60) : 0,
          p?.attempts?.length || 0,
        ]
          .map(csvCell)
          .join(';'),
      );
    }
  }

  return { filename: `${data.company.firstName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-progress.csv`, csv: `﻿${lines.join('\r\n')}` };
};

export const CompanyReportServices = {
  getOverview,
  getTeams,
  getTeamDetail,
  getLearners,
  getLearnerDetail,
  getModules,
  getModuleDetail,
  getAccess,
  exportProgressCsv,
};
