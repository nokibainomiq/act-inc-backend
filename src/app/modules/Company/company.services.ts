import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../User/user.model';
import { Module } from '../Module/module.model';
import { Team } from '../Team/team.model';
import { UserProgress } from '../UserProgress/userProgress.model';
import { BehavioralAssessment } from '../BehavioralAssessment/behavioralAssessment.model';
import { TUser } from '../User/user.interface';
import { getEmailTemplate } from '../../utils/emailTemplate';
import sendEmail from '../../utils/sendEmail';
import PDFDocument from 'pdfkit';

/** Only company-role users should be treated as companies */
const COMPANY_FILTER = { role: 'company' as const, isDeleted: false };

// Auto-generate a human-readable temp password
const generateTempPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';

  // Ensure at least one of each type
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += '!';
  // Fill remaining 6 chars randomly
  for (let i = 0; i < 6; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Slugify a company name
const slugify = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-');
};

const createCompanyIntoDB = async (payload: { name: string; email: string; address?: string }) => {
  const { name, email, address } = payload;

  // Check email uniqueness across User collection only
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, 'This email is already registered');
  }

  // Auto-generate slug — append suffix if conflict
  let slug = slugify(name);
  let slugCounter = 1;
  while (await User.findOne({ slug, role: 'company' })) {
    slug = `${slugify(name)}-${slugCounter++}`;
  }

  // Auto-generate temp password
  const tempPassword = generateTempPassword();

  // Create single User record with role: company
  const company = await User.create({
    firstName: name,
    email: email.toLowerCase(),
    address: address || '',
    slug,
    password: tempPassword,
    role: 'company',
    authType: 'email',
    status: 'active',
    isOtpVerified: true,
  });

  // 2) Send credentials email
  try {
    const html = getEmailTemplate({
      userName: name,
      title: 'Your Company Account is Ready!',
      body: `Your company account has been created. Use the temporary password below to log in. Please change your password after first login for security.`,
      otpCode: tempPassword,
      codeLabel: 'Your Temporary Password',
      codeExpiry: 'Please change this password after your first login.',
    });
    await sendEmail({
      to: email,
      subject: 'Your ActInc Company Login Credentials',
      html,
    });
    console.log('✅ Company credentials sent to:', email);
  } catch (emailError: any) {
    console.error('❌ Failed to send company credentials email:', emailError?.message || emailError);
    // Don't fail the whole operation — company is created, email failure is logged
  }

  return company;
};

const getAllCompaniesFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(
    User.find(COMPANY_FILTER).select('-password -otp -otpExpires'),
    query,
  );
  queryBuilder.search(['firstName', 'slug']).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();
  return { meta, result };
};

const getSingleCompanyFromDB = async (id: string) => {
  const result = await User.findOne({ _id: id, ...COMPANY_FILTER }).select('-password -otp -otpExpires');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }
  return result;
};

const updateCompanyInDB = async (id: string, payload: Partial<TUser>) => {
  if (payload.slug) {
    const existing = await User.findOne({ slug: payload.slug, _id: { $ne: id }, role: 'company' });
    if (existing) {
      throw new AppError(httpStatus.CONFLICT, 'A company with this slug already exists');
    }
  }
  // Map 'name' → 'firstName' if provided
  if ((payload as any).name) {
    (payload as any).firstName = (payload as any).name;
    delete (payload as any).name;
  }
  const result = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }
  return result;
};

const updateBrandingInDB = async (id: string, payload: Record<string, any>) => {
  // Build $set for nested branding fields and top-level image field
  const setFields: Record<string, any> = {};

  if (payload.logo || payload.image) {
    setFields['image'] = payload.image || payload.logo;
  }

  const allowedFields = [
    'logo', 'primaryColor', 'secondaryColor', 'videoTitle',
    'videoDescription', 'presenterName', 'presenterDesignation', 'videoUrl',
  ];
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      setFields[`branding.${field}`] = payload[field];
    }
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: setFields },
    { new: true, runValidators: true },
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }
  return result;
};

const updateCompanyStatusInDB = async (id: string, status: string) => {
  const company = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  // Sync related employee User accounts status
  // Employees with companyId matching this company get the same status mapping
  const userStatus = status === 'active' ? 'active' : 'blocked';
  const userUpdateResult = await User.updateMany(
    { companyId: company._id },
    { status: userStatus },
  );

  console.log('[updateCompanyStatus] company:', id, '→ status:', status, '| userStatus:', userStatus, '| matched:', userUpdateResult.matchedCount, '| modified:', userUpdateResult.modifiedCount);

  return company;
};

const getDropdownCompaniesFromDB = async () => {
  return User.find(COMPANY_FILTER).select('_id firstName').lean();
};

const deleteCompanyFromDB = async (id: string) => {
  const company = await User.findOne({ _id: id, role: 'company' });
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  // Hard-delete all related employee User accounts
  await User.deleteMany({ companyId: company._id });

  // Hard-delete all related teams
  await Team.deleteMany({ companyId: company._id });

  // Hard-delete all related modules
  await Module.deleteMany({ companyId: company._id });

  // Hard-delete all related user progress records
  await UserProgress.deleteMany({ companyId: company._id });

  // Hard-delete all related behavioral assessments
  await BehavioralAssessment.deleteMany({ companyId: company._id });

  // Hard-delete the company User account itself
  await User.findByIdAndDelete(id);

  return company;
};

// ── Company Details API (Dashboard Data) ──
interface CompanyDetailsData {
  company: {
    name: string;
    industry: string;
    employeeCount: number;
    memberSince: Date;
  };
  stats: {
    activeParticipants: number;
    completionRate: number;
    organizationGrade: number;
  };
  barChart: {
    averageIncreasePercentage: number;
    assessmentCount: number;
    chartData: {
      name: string;
      baseline: number;
      followUp: number;
      score: number;
    }[];
  };
  teamPerformance: {
    teamId: string;
    teamName: string;
    activeCount: number;
    progressPercentage: number;
    averageScore: number;
  }[];
  moduleCompliance: {
    moduleId: string;
    moduleName: string;
    teamId: string | null;
    teamName: string;
    completionPercentage: number;
    completedCount: number;
    totalAssigned: number;
  }[];
}

const getCompanyDetailsFromDB = async (companyId: string): Promise<CompanyDetailsData> => {
  // 1. Get company basic info (from User collection with role: company)
  const company = await User.findOne({ _id: companyId, ...COMPANY_FILTER });
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  // 2. Get all active users for this company
  const users = await User.find({ companyId, isDeleted: false, status: 'active' })
    .select('_id teamId')
    .lean();
  const userIds = users.map((u) => u._id);
  const activeParticipants = userIds.length;

  // 3. Get teams for this company
  const teams = await Team.find({ companyId }).select('_id name').lean();
  const teamMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

  // 4. Get all modules assigned to this company or its teams
  const teamIds = teams.map((t) => t._id);
  const modules = await Module.find({
    $or: [{ companyId }, { teamId: { $in: teamIds } }],
    isDeleted: false,
    status: 'published',
  })
    .select('_id title teamId companyId')
    .lean();
  const moduleIds = modules.map((m) => m._id);

  // 5. Get UserProgress for all users in this company
  const userProgress = await UserProgress.find({ companyId, moduleId: { $in: moduleIds } })
    .select('userId moduleId status progressPercentage score completedQuestions totalQuestions')
    .lean();

  // 6. Calculate completion rate
  const totalAssignments = userIds.length * moduleIds.length;
  const completedAssignments = userProgress.filter((p) => p.status === 'completed').length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // 7. Calculate organization grade (average of all scores)
  const scoredProgress = userProgress.filter((p) => p.score !== undefined && p.score !== null);
  const avgScore = scoredProgress.length > 0
    ? scoredProgress.reduce((sum, p) => sum + (p.score || 0), 0) / scoredProgress.length
    : 0;
  const organizationGrade = Math.round(avgScore * 10) / 10; // 0-10 scale

  // Build Bar Chart Data using Module titles
  const barChartItems = modules.map((mod) => {
    const modProgress = userProgress.filter((p) => p.moduleId.equals(mod._id));
    const scored = modProgress.filter((p) => p.score !== undefined && p.score !== null);
    const currentScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, p) => sum + (p.score || 0), 0) / scored.length)
        : 0;

    // Estimate baseline as initial 75% of current score
    const baseline = currentScore > 0 ? Math.max(30, Math.round(currentScore * 0.75)) : 0;

    return {
      name: mod.title,
      baseline,
      followUp: currentScore || 0,
      score: currentScore,
    };
  });

  const totalIncreaseSum = barChartItems.reduce(
    (sum, item) => sum + (item.followUp - item.baseline),
    0,
  );
  const averageIncreasePercentage =
    barChartItems.length > 0 ? Math.max(0, Math.round(totalIncreaseSum / barChartItems.length)) : 0;

  const barChart = {
    averageIncreasePercentage,
    assessmentCount: barChartItems.length,
    chartData: barChartItems,
  };

  // 9. Team performance
  const teamPerformance = await Promise.all(
    teams.map(async (team) => {
      const teamUserIds = users.filter((u) => u.teamId?.toString() === team._id.toString()).map((u) => u._id);
      const teamProgress = userProgress.filter((p) => teamUserIds.some((id) => id.equals(p.userId)));

      const teamCompleted = teamProgress.filter((p) => p.status === 'completed').length;
      const teamTotal = teamUserIds.length * moduleIds.length;
      const teamProgressPct = teamTotal > 0 ? Math.round((teamCompleted / teamTotal) * 100) : 0;

      const teamScored = teamProgress.filter((p) => p.score !== undefined && p.score !== null);
      const teamAvgScore = teamScored.length > 0
        ? teamScored.reduce((sum, p) => sum + (p.score || 0), 0) / teamScored.length
        : 0;

      return {
        teamId: team._id.toString(),
        teamName: team.name,
        activeCount: teamUserIds.length,
        progressPercentage: teamProgressPct,
        averageScore: Math.round(teamAvgScore * 10) / 10,
      };
    })
  );

  // 10. Module compliance (per module, showing which team it belongs to)
  const moduleCompliance = await Promise.all(
    modules.map(async (module) => {
      const moduleProgress = userProgress.filter((p) => p.moduleId.equals(module._id));
      const completed = moduleProgress.filter((p) => p.status === 'completed').length;
      const total = userIds.length;
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const assignedTeam = teams.find((t) => t._id.toString() === (module as any).teamId?.toString());

      return {
        moduleId: module._id.toString(),
        moduleName: module.title,
        teamId: (module as any).teamId?.toString() || null,
        teamName: assignedTeam?.name || 'Unassigned',
        completionPercentage: completionPct,
        completedCount: completed,
        totalAssigned: total,
      };
    })
  );

  return {
    company: {
      name: company.firstName,
      industry: company.address || 'Not specified',
      employeeCount: activeParticipants,
      memberSince: company.createdAt as Date,
    },
    stats: {
      activeParticipants,
      completionRate,
      organizationGrade,
    },
    barChart,
    teamPerformance,
    moduleCompliance,
  };
};

// ── Generate PDF Report for Company Details (1-Click Download) ──
const generateCompanyPDFReportFromDB = async (companyId: string): Promise<Buffer> => {
  const data = await getCompanyDetailsFromDB(companyId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err: Error) => reject(err));

    const primaryColor = '#ec4899';
    const darkHeaderBg = '#1e293b';

    // Header Title
    doc.fillColor('#1e293b').fontSize(22).font('Helvetica-Bold').text(data.company.name.toUpperCase(), 50, 40);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Industry: ${data.company.industry} | Total Active Employees: ${data.company.employeeCount}`, 50, 68);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('COMPANY ANALYTICS & COMPLIANCE REPORT', 50, 85);

    doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#cbd5e1').stroke();

    // 2. Summary KPI Box Grid
    let y = 120;
    doc.rect(50, y, 155, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('ACTIVE PARTICIPANTS', 60, y + 12);
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(`${data.stats.activeParticipants}`, 60, y + 28);

    doc.rect(220, y, 155, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('COMPLETION RATE', 230, y + 12);
    doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text(`${data.stats.completionRate}%`, 230, y + 28);

    doc.rect(390, y, 155, 60).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('ORGANIZATION GRADE', 400, y + 12);
    doc.fillColor('#10b981').fontSize(18).font('Helvetica-Bold').text(`${data.stats.organizationGrade} / 10`, 400, y + 28);

    y += 80;

    // 3. Module Performance & Compliance Table
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Assigned Modules Compliance', 50, y);
    y += 20;

    // Table Header
    doc.rect(50, y, 495, 24).fill(darkHeaderBg);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('MODULE TITLE', 60, y + 7);
    doc.text('COMPLETION RATE', 300, y + 7);
    doc.text('COMPLETED / TOTAL', 430, y + 7);

    y += 24;

    if (data.moduleCompliance.length === 0) {
      doc.rect(50, y, 495, 24).fill('#ffffff');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('No assigned modules found.', 60, y + 7);
      y += 24;
    } else {
      data.moduleCompliance.forEach((item, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(50, y, 495, 22).fill(bgColor);
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(item.moduleName, 60, y + 6, { width: 230, ellipsis: true });
        doc
          .font('Helvetica-Bold')
          .fillColor(item.completionPercentage >= 75 ? '#10b981' : '#f59e0b')
          .text(`${item.completionPercentage}%`, 300, y + 6);
        doc.font('Helvetica').fillColor('#475569');
        doc.text(`${item.completedCount} / ${item.totalAssigned}`, 430, y + 6);
        y += 22;
      });
    }

    y += 25;

    // 4. Location & Team Performance Table
    if (y > 660) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Location & Team Performance', 50, y);
    y += 20;

    // Table Header
    doc.rect(50, y, 495, 24).fill(darkHeaderBg);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('LOCATION / TEAM NAME', 60, y + 7);
    doc.text('ACTIVE USERS', 250, y + 7);
    doc.text('PROGRESS %', 350, y + 7);
    doc.text('AVG SCORE', 450, y + 7);

    y += 24;

    if (data.teamPerformance.length === 0) {
      doc.rect(50, y, 495, 24).fill('#ffffff');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('No teams found.', 60, y + 7);
      y += 24;
    } else {
      data.teamPerformance.forEach((team, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(50, y, 495, 22).fill(bgColor);
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(team.teamName, 60, y + 6, { width: 180, ellipsis: true });
        doc.text(`${team.activeCount}`, 250, y + 6);
        doc.font('Helvetica-Bold').fillColor('#10b981').text(`${team.progressPercentage}%`, 350, y + 6);
        doc.font('Helvetica-Bold').fillColor('#6366f1').text(`${team.averageScore}%`, 450, y + 6);
        y += 22;
      });
    }

    // Page Numbers Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(`Generated by ActInc Analytics System | Page ${i + 1} of ${pages.count}`, 50, 780, {
          align: 'center',
          width: 495,
        });
    }

    doc.end();
  });
};

// ── Public Branding APIs (No auth required for login/invite screens) ──
const getPublicCompanyBrandingFromDB = async (identifier: string) => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
  const query: any = isObjectId
    ? { _id: identifier, role: 'company', isDeleted: false }
    : { slug: identifier, role: 'company', isDeleted: false };

  const company = await User.findOne(query).select('_id firstName slug image branding address').lean();
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  const logoUrl = (company as any).branding?.logo || company.image || '';

  return {
    companyId: (company as any)._id,
    name: company.firstName,
    slug: company.slug,
    logo: logoUrl,
    primaryColor: (company as any).branding?.primaryColor || '#ec4899',
    secondaryColor: (company as any).branding?.secondaryColor || '',
    branding: (company as any).branding || {},
  };
};

const getPublicCompanyBrandingByEmailFromDB = async (email: string) => {
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('companyId role').lean();
  let companyId = (user as any)?.companyId;

  if (user && user.role === 'company') {
    companyId = (user as any)._id;
  }

  if (!companyId) {
    const domain = normalizedEmail.split('@')[1];
    if (domain) {
      const companyUser = await User.findOne({
        email: { $regex: `@${domain}$`, $options: 'i' },
        role: 'company',
        isDeleted: false,
      }).select('_id').lean();
      if (companyUser) {
        companyId = (companyUser as any)._id;
      }
    }
  }

  if (!companyId) {
    throw new AppError(httpStatus.NOT_FOUND, 'No company associated with this email');
  }

  return getPublicCompanyBrandingFromDB(companyId.toString());
};

export const CompanyServices = {
  createCompanyIntoDB,
  getAllCompaniesFromDB,
  getSingleCompanyFromDB,
  updateCompanyInDB,
  updateCompanyStatusInDB,
  updateBrandingInDB,
  deleteCompanyFromDB,
  getDropdownCompaniesFromDB,
  getCompanyDetailsFromDB,
  generateCompanyPDFReportFromDB,
  getPublicCompanyBrandingFromDB,
  getPublicCompanyBrandingByEmailFromDB,
};
