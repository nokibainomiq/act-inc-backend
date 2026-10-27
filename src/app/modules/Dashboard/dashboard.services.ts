import { User } from '../User/user.model';
import { Module } from '../Module/module.model';

// ── Get Platform Overview Stats ──
const getPlatformStats = async () => {
  // 1. Get all registered, non-deleted companies
  const activeCompanies = await User.find({ role: 'company', isDeleted: false }).select('_id');
  const activeCompanyIds = activeCompanies.map((c) => c._id);

  // 2. Count employees and modules linked to registered active companies
  const [activeEmployees, totalModules] = await Promise.all([
    User.countDocuments({
      role: { $in: ['user', 'guest'] },
      isDeleted: false,
      status: 'active',
      companyId: { $in: activeCompanyIds },
    }),
    Module.countDocuments({
      isDeleted: false,
    }),
  ]);

  return {
    totalClientCompanies: activeCompanies.length,
    activeEmployees,
    totalModules,
  };
};

// ── Get Company Breakdown Table ──
const getCompanyBreakdown = async () => {
  // Aggregate users count per company
  const userCounts = await User.aggregate([
    { $match: { role: { $in: ['user', 'guest'] }, isDeleted: false, status: 'active' } },
    { $group: { _id: '$companyId', activeUsers: { $sum: 1 } } },
  ]);

  // Aggregate modules count per company
  const moduleCounts = await Module.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$companyId', modulesBuilt: { $sum: 1 } } },
  ]);

  // Create lookup maps for quick access
  const userCountMap = new Map(
    userCounts.map((item) => [item._id?.toString(), item.activeUsers])
  );
  const moduleCountMap = new Map(
    moduleCounts.map((item) => [item._id?.toString(), item.modulesBuilt])
  );

  // Get all non-deleted companies (Users with role: company)
  const companies = await User.find({ role: 'company', isDeleted: false })
    .select('firstName status')
    .sort({ firstName: 1 });

  // Build the table data
  const tableData = companies.map((company) => {
    const companyId = company._id.toString();
    return {
      companyId,
      company: company.firstName,
      activeUsers: userCountMap.get(companyId) || 0,
      modulesBuilt: moduleCountMap.get(companyId) || 0,
      platformStatus: company.status === 'active' ? 'Active' : 
                      company.status === 'suspended' ? 'Suspended' : 'Inactive',
    };
  });

  return tableData;
};

// ── Get Full Dashboard Data ──
const getDashboardData = async () => {
  const [stats, companyBreakdown] = await Promise.all([
    getPlatformStats(),
    getCompanyBreakdown(),
  ]);

  return {
    stats,
    companyBreakdown,
  };
};

export const DashboardServices = {
  getPlatformStats,
  getCompanyBreakdown,
  getDashboardData,
};
