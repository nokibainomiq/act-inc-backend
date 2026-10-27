// ──────────────────────────────────────────────────────────
//  Centralized Visibility Score Configuration
//  Total must never exceed 100
// ──────────────────────────────────────────────────────────

export const VISIBILITY_POINTS = {
  BUSINESS_VERIFICATION: 25, // Get a verified badge
  SERVICES_VARIETY: 20,      // Create services in 3 different categories
  PACKAGES_PRICING: 20,      // Set up detailed service packages
  ACTIVITY_ENGAGEMENT: 15,   // Login frequency, response time, portfolio updates
  QUICK_QUOTES: 10,          // Respond quickly to customer requests
  ADS_PROMOTION: 10,         // Launch first ad/promotion
} as const;

export type VisibilityTaskKey = keyof typeof VISIBILITY_POINTS;

export interface IVisibilityTask {
  key: VisibilityTaskKey;
  label: string;
  description: string;
  points: number;
  icon: string;
}

export const VISIBILITY_TASKS: IVisibilityTask[] = [
  {
    key: 'BUSINESS_VERIFICATION',
    label: 'Business Verification',
    description: 'Get a verified badge',
    points: 25,
    icon: '🛡️',
  },
  {
    key: 'SERVICES_VARIETY',
    label: 'Services Variety',
    description: 'Create services in 3 different categories',
    points: 20,
    icon: '🛠️',
  },
  {
    key: 'PACKAGES_PRICING',
    label: 'Packages & Pricing',
    description: 'Set up detailed service packages',
    points: 20,
    icon: '📦',
  },
  {
    key: 'ACTIVITY_ENGAGEMENT',
    label: 'Activity & Engagement',
    description: 'Login frequency, response time, portfolio updates',
    points: 15,
    icon: '⚡',
  },
  {
    key: 'QUICK_QUOTES',
    label: 'Quick Quote Submissions',
    description: 'Respond quickly to customer requests',
    points: 10,
    icon: '💬',
  },
  {
    key: 'ADS_PROMOTION',
    label: 'Get More Leads with Ads',
    description: 'Launch first ad/promotion',
    points: 10,
    icon: '📢',
  },
];

export const MAX_VISIBILITY_SCORE = 100;
