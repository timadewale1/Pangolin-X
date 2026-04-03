export type FarmerDoc = {
  name?: string;
  email?: string;
  phone?: string;
  state?: string | null;
  lga?: string | null;
  crops?: string[];
  title?: string;
  language?: string;
  lat?: number | null;
  lon?: number | null;
  cropStatus?: Record<string, { stage?: string; plantedAt?: string }>;
  photoURL?: string;
  accessCodeUsed?: boolean;
  soil?: unknown;
  soilSummary?: string | null;
  plan?: string | null;
  paidAccess?: boolean;
  paymentDate?: string | null;
  nextPaymentDate?: string | null;
  paymentReference?: string | null;
  createdAt?: string | null;
};

export type WeatherData = {
  current?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
    weather?: { description?: string; icon?: string }[];
    wind_speed?: number;
  };
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
  };
  weather?: { description?: string; icon?: string }[];
  wind?: { speed?: number };
  timezone?: string;
  lat?: number;
  lon?: number;
};

export type ForecastDay = {
  dt: number;
  temp: {
    min?: number;
    max?: number;
    day?: number;
    night?: number;
  };
  weather: Array<{
    description?: string;
    main?: string;
    icon?: string;
    id?: number;
  }>;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
};

export type AdvisoryRecord = {
  id: string;
  advice?: string;
  advisory?: string;
  header?: string;
  details?: AdvisoryDetail[];
  crops: string[];
  createdAt?: string | Date | { seconds: number; nanoseconds?: number };
};

export type AdvisoryDetail = {
  crop: string;
  headline: string;
  summary: string;
  riskLevel: "low" | "moderate" | "high";
  confidence: number;
  operationalPosture?: string;
  whyNow?: string;
  inputFocus?: string;
  fieldAccess?: string;
  expectedOutcome?: string;
  actions: string[];
  watchouts: string[];
  timing: string[];
  marketIntel?: string;
  sourceTags: string[];
  advice: string;
};

export type AdvisoryResponse = {
  header: string;
  generatedFor?: string;
  executiveSummary?: string;
  priorityWindow?: string;
  regionalSignals?: string[];
  items: AdvisoryDetail[];
};

export type FragilitySource = {
  id: string;
  title: string;
  source: string;
  publishedAt?: string;
  url?: string;
  type: "news" | "institutional";
};

export type FragilitySection = {
  title: string;
  summary: string;
  severity: "low" | "moderate" | "high";
  score: number;
  trend: "rising" | "stable" | "falling";
  sourceRefs: string[];
};

export type FragilityScoreBreakdown = {
  flood: number;
  conflict: number;
  infrastructure: number;
  health: number;
  climate: number;
};

export type ZoneScore = {
  zone: string;
  score: number;
  severity: "low" | "moderate" | "high";
  highlighted?: boolean;
};

export type FragilityReport = {
  header: string;
  generatedAt: string;
  location: {
    state?: string | null;
    lga?: string | null;
    zone?: string | null;
  };
  overallScore: number;
  confidence: number;
  recommendedChannels: string[];
  sections: FragilitySection[];
  scores: FragilityScoreBreakdown;
  zoneScores: ZoneScore[];
  sources: FragilitySource[];
};
