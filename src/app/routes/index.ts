import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.routes';
import { UserRoutes } from '../modules/User/user.routes';
import aboutRouter from '../modules/about/about.route';
import privacyPolicyRouter from '../modules/PrivacyPolicy/privacyPolicy.routes';
import termsRouter from '../modules/Terms/terms.route';
import { FaqRoutes } from '../modules/FAQ/faq.routes';
import { ContactRoutes } from '../modules/ContactUs/contact.route';
import { NotificationRoutes } from '../modules/Notification/notification.routes';
import { AdminRoutes } from '../modules/Admin/admin.routes';
import { CompanyRoutes } from '../modules/Company/company.routes';
import { TeamRoutes } from '../modules/Team/team.routes';
import { ModuleRoutes } from '../modules/Module/module.routes';
import { DashboardRoutes } from '../modules/Dashboard/dashboard.routes';
import { UserProgressRoutes } from '../modules/UserProgress/userProgress.routes';
import { TrainingRoutes } from '../modules/Training/training.routes';
import { FeaturedTrainingRoutes } from '../modules/FeaturedTraining/featuredTraining.routes';
import { AnalyticsRoutes } from '../modules/Analytics/analytics.routes';
import { TrainingInviteRoutes } from '../modules/TrainingInvite/trainingInvite.routes';
import { TranslationRoutes } from '../modules/Translation/translation.routes';


const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route:AuthRoutes
  },
  {
    path: '/user',
    route:UserRoutes
  },
  {
    path: '/about',
    route:aboutRouter
  },
  {
    path: '/privacy',
    route:privacyPolicyRouter
  },
  {
    path: '/terms',
    route:termsRouter
  },
  {
    path: '/faq',
    route:FaqRoutes
  },
  {
    path: '/contact',
    route:ContactRoutes
  },

  { path: '/notification', route: NotificationRoutes },  
  { path: '/admin', route: AdminRoutes },
  { path: '/company', route: CompanyRoutes },
  { path: '/team', route: TeamRoutes },
  { path: '/module', route: ModuleRoutes },
  { path: '/dashboard', route: DashboardRoutes },
  { path: '/user-progress', route: UserProgressRoutes },
  { path: '/training', route: TrainingRoutes },
  { path: '/training-invite', route: TrainingInviteRoutes },
  { path: '/featured-training', route: FeaturedTrainingRoutes },
  { path: '/analytics', route: AnalyticsRoutes },
  { path: '/translate', route: TranslationRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
