/**
 * The single service contract the UI talks to.
 *
 * STEP 1 (current): implemented by the mock service (lib/services/mock).
 * STEP 2 (later):   implemented by the live API client (lib/services/api),
 *                   which calls the backend and maps `{ data }` envelopes
 *                   into these exact return types.
 *
 * The UI imports `api` from `lib/services` and never knows which backs it.
 */
import type {
  AuthSession,
  CarbonResult,
  CompanyDashboard,
  CompareOption,
  DateRange,
  EmissionAnalytics,
  EmployeeDashboard,
  EsgReport,
  Leaderboard,
  LeaderboardMetric,
  Language,
  MonthlyPrediction,
  PlacePrediction,
  Recommendation,
  Redemption,
  Reward,
  RewardCatalog,
  Ride,
  RideReward,
  RouteDistance,
  TripPurpose,
  User,
  VehicleClass,
  VehicleProfile,
  VehicleProfileId,
} from "@/types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface BookRideInput {
  originName: string;
  destinationName: string;
  distanceKm: number;
  vehicleProfileId: VehicleProfileId;
  purpose: TripPurpose;
  estimatedDurationMinutes?: number;
  priceVnd?: number;
}

export interface RideHistoryQuery extends Partial<DateRange> {
  vehicleProfileId?: VehicleProfileId;
  purpose?: TripPurpose;
  status?: string;
}

export interface GreenMilesApi {
  // auth
  login(input: LoginInput): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;

  // vehicles & carbon
  getVehicleProfiles(): Promise<VehicleProfile[]>;
  searchPlaces(input: string): Promise<PlacePrediction[]>;
  getDistance(
    originName: string,
    destinationName: string,
    vehicle?: string,
  ): Promise<RouteDistance>;
  calculateCarbon(
    distanceKm: number,
    vehicleProfileId: VehicleProfileId,
  ): Promise<CarbonResult>;
  compareVehicles(
    distanceKm: number,
    vehicleClass: VehicleClass,
  ): Promise<CompareOption[]>;

  // rides
  bookRide(input: BookRideInput): Promise<{ ride: Ride; carbon: CarbonResult }>;
  getRideHistory(query?: RideHistoryQuery): Promise<Ride[]>;
  completeRide(
    rideId: string,
  ): Promise<{ ride: Ride; carbon: CarbonResult; reward: RideReward }>;

  // dashboards
  getEmployeeDashboard(range?: DateRange): Promise<EmployeeDashboard>;
  getCompanyDashboard(range?: DateRange): Promise<CompanyDashboard>;
  getLeaderboard(
    metric?: LeaderboardMetric,
    range?: DateRange,
  ): Promise<Leaderboard>;

  // analytics & AI
  getEmissionAnalytics(
    groupBy: EmissionAnalytics["groupBy"],
    range?: DateRange,
  ): Promise<EmissionAnalytics>;
  getMonthlyPrediction(range?: DateRange): Promise<MonthlyPrediction>;
  getRecommendation(
    scope: Recommendation["scope"],
    language?: Language,
    range?: DateRange,
  ): Promise<Recommendation>;

  // rewards
  getRewards(): Promise<RewardCatalog>;
  redeemReward(rewardId: string): Promise<{
    redemption: Redemption;
    remainingGreenPoints: number;
  }>;

  // ESG
  getEsgReport(range?: DateRange): Promise<EsgReport>;
}

/** Re-export for convenience. */
export type { Reward };
