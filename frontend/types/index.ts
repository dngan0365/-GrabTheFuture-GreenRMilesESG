/**
 * Domain model for the GreenMiles platform.
 *
 * These types mirror the backend API contract (BackendSpec.md). The mock
 * service layer (Step 1) returns these shapes directly; the live API client
 * (Step 2) maps `{ data: ... }` responses into the same shapes, so the UI
 * never changes between steps.
 */

// ---------- enums / unions ----------
export type Role = "EMPLOYEE" | "COMPANY_ADMIN";
export type VehicleClass = "MOTORBIKE" | "CAR_4" | "SUV_7";
export type Powertrain = "PETRO" | "ELECTRIC";
export type TripPurpose = "COMMUTE" | "BUSINESS" | "OTHER";
export type RideStatus = "BOOKED" | "COMPLETED" | "CANCELLED";
export type RiskLevel = "ON_TRACK" | "AT_RISK";
export type Language = "en" | "vi";

export type VehicleProfileId =
  | "MOTORBIKE_PETRO"
  | "MOTORBIKE_ELECTRIC"
  | "CAR_4_PETRO"
  | "CAR_4_ELECTRIC"
  | "SUV_7_PETRO"
  | "SUV_7_ELECTRIC";

// ---------- identity ----------
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName?: string;
  department?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ---------- vehicles & carbon ----------
export interface VehicleProfile {
  vehicleProfileId: VehicleProfileId;
  displayName: string;
  vehicleClass: VehicleClass;
  powertrain: Powertrain;
  co2KgPerKm: number;
  energyUsage?: string;
  baselineProfileId?: VehicleProfileId;
}

export interface CarbonResult {
  baselineProfileId: VehicleProfileId | string;
  baselineCo2Kg: number;
  actualCo2Kg: number;
  co2SavedKg: number;
  fuelSavedLiters: number;
  treeEquivalent: number;
}

export interface CompareOption {
  vehicleProfileId: VehicleProfileId;
  displayName: string;
  actualCo2Kg: number;
  baselineCo2Kg: number;
  co2SavedKg: number;
  fuelSavedLiters: number;
  treeEquivalent: number;
  recommended: boolean;
}

// ---------- rides ----------
export interface Ride {
  id: string;
  userId?: string;
  status: RideStatus;
  originName: string;
  destinationName: string;
  distanceKm: number;
  vehicleProfileId: VehicleProfileId;
  vehicleDisplayName: string;
  powertrain?: Powertrain;
  purpose?: TripPurpose;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  priceVnd: number;
  actualCo2Kg?: number;
  baselineCo2Kg?: number;
  co2SavedKg?: number;
  greenPointsAdded?: number;
  date?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface RideReward {
  greenScoreAdded: number;
  greenPointsAdded: number;
}

// ---------- employee dashboard ----------
export interface EmployeeSummary {
  todayEmissionKg: number;
  monthEmissionKg: number;
  monthBaselineEmissionKg: number;
  savedEmissionKg: number;
  fuelSavedLiters: number;
  treeEquivalent: number;
  greenPoints: number;
  greenScore: number;
  rank: number;
}

export interface TripStats {
  totalTrips: number;
  evTrips: number;
  petrolTrips: number;
  evRate: number;
  totalDistanceKm: number;
  evDistanceKm: number;
  petrolDistanceKm: number;
}

export interface EmployeeDashboard {
  employee: Pick<User, "id" | "name" | "department">;
  summary: EmployeeSummary;
  tripStats: TripStats;
}

// ---------- leaderboard ----------
export type LeaderboardMetric =
  | "savedCo2Kg"
  | "greenPoints"
  | "evRate"
  | "evTrips";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  department?: string;
  savedCo2Kg: number;
  greenPoints: number;
  greenScore: number;
  evTrips: number;
  totalTrips: number;
  evRate: number;
}

export interface Leaderboard {
  metric: LeaderboardMetric;
  items: LeaderboardEntry[];
  currentUserRank?: Pick<
    LeaderboardEntry,
    "rank" | "userId" | "savedCo2Kg" | "greenPoints"
  >;
}

// ---------- company dashboard ----------
export interface CompanySummary {
  employees: number;
  totalTrips: number;
  evTrips: number;
  petrolTrips: number;
  evRate: number;
  totalDistanceKm: number;
  totalEmissionKg: number;
  baselineEmissionKg: number;
  savedEmissionKg: number;
  fuelSavedLiters: number;
  treeEquivalent: number;
  moneySavedVnd: number;
}

export interface DepartmentStat {
  department: string;
  savedEmissionKg: number;
  evRate: number;
}

export interface CompanyDashboard {
  company: { id: string; name: string };
  summary: CompanySummary;
  topDepartments: DepartmentStat[];
}

// ---------- analytics ----------
export type AnalyticsGroupBy =
  | "day"
  | "week"
  | "month"
  | "department"
  | "vehicleProfile";

export interface EmissionPoint {
  label: string;
  totalTrips: number;
  evTrips: number;
  petrolTrips: number;
  totalDistanceKm: number;
  actualCo2Kg: number;
  baselineCo2Kg: number;
  savedCo2Kg: number;
  evRate: number;
}

export interface ForecastPoint {
  label: string;
  savedCo2Kg: number;
}

export interface EmissionAnalytics {
  groupBy: AnalyticsGroupBy;
  items: EmissionPoint[];
  /** Regression-predicted daily CO₂ saved (future), for the dashed chart line. */
  forecast?: ForecastPoint[];
}

// ---------- predictions ----------
export interface MonthlyPrediction {
  companyId: string;
  period: { from: string; to: string; daysElapsed: number; totalDays: number };
  current: {
    actualEmissionKg: number;
    savedEmissionKg: number;
    evRate: number;
    totalTrips: number;
  };
  prediction: {
    predictedEmissionKg: number;
    predictedSavedKg: number;
    predictedEvRate: number;
    confidence: number;
  };
  status: { targetEmissionKg: number; riskLevel: RiskLevel; gapKg: number };
  model: { modelId: string; modelType: string };
}

// ---------- recommendations ----------
export interface RecommendationItem {
  title: string;
  reason: string;
  estimatedCo2ReductionKg: number;
}

export interface Recommendation {
  scope: "employee" | "company" | "department";
  summary: string;
  recommendations: RecommendationItem[];
  nextBestAction: string;
  model: { provider: string; model: string };
}

// ---------- rewards ----------
export interface Reward {
  id: string;
  name: string;
  description: string;
  requiredGreenPoints: number;
  valueVnd: number;
  eligible: boolean;
}

export interface RewardCatalog {
  userPoints: number;
  items: Reward[];
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardName: string;
  greenPointsSpent: number;
  voucherCode: string;
  redeemedAt: string;
}

// ---------- ESG report ----------
export interface EsgReport {
  reportType: string;
  companyId: string;
  period: { from: string; to: string };
  summary: {
    employees: number;
    totalTrips: number;
    evTrips: number;
    petrolTrips: number;
    evRate: number;
    totalDistanceKm: number;
    baselineEmissionKg: number;
    actualEmissionKg: number;
    savedEmissionKg: number;
    fuelSavedLiters: number;
    treeEquivalent: number;
  };
  methodology: {
    runtimeFormula: string;
    savedFormula: string;
    baselineLogic: string;
    gridEmissionFactor: string;
    sources: string[];
  };
  vehicleProfiles: Array<{
    vehicleProfileId: string;
    energyUsage: string;
    co2KgPerKm: number;
  }>;
}

// ---------- shared date-range query ----------
export interface DateRange {
  from: string;
  to: string;
}

// ---------- route distance (Goong) ----------
export interface PlacePrediction {
  description: string;
  placeId: string;
}

export interface RouteDistance {
  originName: string;
  destinationName: string;
  distanceKm: number;
  durationMinutes?: number;
  provider?: string;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  /** Encoded polyline of the route (Goong/Google algorithm). */
  overviewPolyline?: string | null;
}
