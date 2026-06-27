/**
 * MOCK implementation of GreenMilesApi (Step 1).
 *
 * Returns the static fixtures with a small simulated latency so loading states
 * are exercised. Recommendations/predictions are computed lightly from the
 * fixtures so they feel responsive to inputs.
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
  Language,
  Leaderboard,
  LeaderboardMetric,
  MonthlyPrediction,
  Recommendation,
  Redemption,
  RewardCatalog,
  Ride,
  RideReward,
  User,
  VehicleClass,
  VehicleProfile,
  VehicleProfileId,
} from "@/types";
import type {
  BookRideInput,
  GreenMilesApi,
  LoginInput,
  RideHistoryQuery,
} from "../contract";
import {
  calculateCarbon,
  compareVehicles,
  greenPointsFor,
  greenScoreFor,
  VEHICLE_PROFILE_LIST,
  VEHICLE_PROFILES,
} from "./vehicle-profiles";
import {
  COMPANY_DASHBOARD,
  DAILY_EMISSION,
  DEPARTMENT_EMISSION,
  DEMO_PASSWORDS,
  DEMO_USERS,
  EMPLOYEE_DASHBOARD,
  ESG_REPORT,
  LEADERBOARD,
  REWARDS,
  RIDE_HISTORY,
} from "./fixtures";

const delay = <T>(value: T, ms = 280): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function metricValue(e: (typeof LEADERBOARD)[number], m: LeaderboardMetric) {
  return m === "greenPoints"
    ? e.greenPoints
    : m === "evRate"
      ? e.evRate
      : m === "evTrips"
        ? e.evTrips
        : e.savedCo2Kg;
}

export const mockApi: GreenMilesApi = {
  // ---------- auth ----------
  async login({ email, password }: LoginInput): Promise<AuthSession> {
    const key = email.toLowerCase();
    const user = DEMO_USERS[key];
    if (!user || DEMO_PASSWORDS[key] !== password) {
      throw new Error("Invalid email or password.");
    }
    return delay({
      accessToken: `mock-access-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      user,
    });
  },

  async logout(): Promise<void> {
    return delay(undefined, 120);
  },

  async getCurrentUser(): Promise<User> {
    return delay(DEMO_USERS["tam@greencorp.vn"]);
  },

  // ---------- vehicles & carbon ----------
  async getVehicleProfiles(): Promise<VehicleProfile[]> {
    return delay(VEHICLE_PROFILE_LIST);
  },

  async getDistance(
    originName: string,
    destinationName: string,
  ): Promise<import("@/types").RouteDistance> {
    // Deterministic pseudo-distance from the two names (8–22 km) so the mock
    // behaves consistently without a maps provider.
    const seed = `${originName}|${destinationName}`
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const distanceKm = Number((8 + (seed % 140) / 10).toFixed(1));
    // Deterministic HCMC-area coordinates so the map can render in mock mode.
    const originLat = 10.776 + ((seed % 30) - 15) / 1000;
    const originLng = 106.7 + ((seed % 24) - 12) / 1000;
    const destLat = 10.79 + ((seed % 50) - 25) / 1000;
    const destLng = 106.72 + ((seed % 40) - 20) / 1000;
    return delay({
      originName,
      destinationName,
      distanceKm,
      durationMinutes: Math.max(5, Math.round((distanceKm / 24) * 60)),
      provider: "mock",
      originLat,
      originLng,
      destLat,
      destLng,
      overviewPolyline: null,
    });
  },

  async searchPlaces(
    input: string,
  ): Promise<import("@/types").PlacePrediction[]> {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const PLACES = [
      "District 1, Ho Chi Minh City",
      "District 3, Ho Chi Minh City",
      "District 7, Ho Chi Minh City",
      "Thu Duc City, Ho Chi Minh City",
      "Binh Thanh District, Ho Chi Minh City",
      "Tan Binh District, Ho Chi Minh City",
      "Phu Nhuan District, Ho Chi Minh City",
      "Landmark 81, Binh Thanh, HCMC",
      "Ben Thanh Market, District 1, HCMC",
      "Tan Son Nhat Airport, Tan Binh, HCMC",
      "Crescent Mall, District 7, HCMC",
      "Vincom Thu Duc, Thu Duc, HCMC",
    ];
    return delay(
      PLACES.filter((p) => p.toLowerCase().includes(q))
        .slice(0, 6)
        .map((description, i) => ({ description, placeId: `mock_${i}` })),
      150,
    );
  },

  async calculateCarbon(
    distanceKm: number,
    vehicleProfileId: VehicleProfileId,
  ): Promise<CarbonResult> {
    return delay(calculateCarbon(distanceKm, vehicleProfileId));
  },

  async compareVehicles(
    distanceKm: number,
    vehicleClass: VehicleClass,
  ): Promise<CompareOption[]> {
    return delay(compareVehicles(distanceKm, vehicleClass));
  },

  // ---------- rides ----------
  async bookRide(
    input: BookRideInput,
  ): Promise<{ ride: Ride; carbon: CarbonResult }> {
    const profile = VEHICLE_PROFILES[input.vehicleProfileId];
    const carbon = calculateCarbon(input.distanceKm, input.vehicleProfileId);
    const ride: Ride = {
      id: `ride_${Date.now().toString().slice(-6)}`,
      status: "BOOKED",
      originName: input.originName,
      destinationName: input.destinationName,
      distanceKm: input.distanceKm,
      vehicleProfileId: input.vehicleProfileId,
      vehicleDisplayName: profile.displayName,
      powertrain: profile.powertrain,
      purpose: input.purpose,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      priceVnd: input.priceVnd ?? 0,
      actualCo2Kg: carbon.actualCo2Kg,
      baselineCo2Kg: carbon.baselineCo2Kg,
      co2SavedKg: carbon.co2SavedKg,
      createdAt: new Date().toISOString(),
    };
    return delay({ ride, carbon });
  },

  async getRideHistory(query?: RideHistoryQuery): Promise<Ride[]> {
    let items = [...RIDE_HISTORY];
    if (query?.vehicleProfileId) {
      items = items.filter(
        (r) => r.vehicleProfileId === query.vehicleProfileId,
      );
    }
    if (query?.purpose) items = items.filter((r) => r.purpose === query.purpose);
    if (query?.status) items = items.filter((r) => r.status === query.status);
    return delay(items);
  },

  async completeRide(
    rideId: string,
  ): Promise<{ ride: Ride; carbon: CarbonResult; reward: RideReward }> {
    const base =
      RIDE_HISTORY.find((r) => r.id === rideId) ?? RIDE_HISTORY[0];
    const carbon = calculateCarbon(base.distanceKm, base.vehicleProfileId);
    const ride: Ride = {
      ...base,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    };
    return delay({
      ride,
      carbon,
      reward: {
        greenScoreAdded: greenScoreFor(carbon.co2SavedKg),
        greenPointsAdded: greenPointsFor(carbon.co2SavedKg),
      },
    });
  },

  // ---------- dashboards ----------
  async getEmployeeDashboard(): Promise<EmployeeDashboard> {
    return delay(EMPLOYEE_DASHBOARD);
  },

  async getCompanyDashboard(): Promise<CompanyDashboard> {
    return delay(COMPANY_DASHBOARD);
  },

  async getLeaderboard(
    metric: LeaderboardMetric = "savedCo2Kg",
  ): Promise<Leaderboard> {
    const items = [...LEADERBOARD]
      .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
      .map((e, i) => ({ ...e, greenScore: Math.round(e.greenPoints / 10), rank: i + 1 }));
    const current = items.find((e) => e.userId === "usr_001");
    return delay({
      metric,
      items,
      currentUserRank: current && {
        rank: current.rank,
        userId: current.userId,
        savedCo2Kg: current.savedCo2Kg,
        greenPoints: current.greenPoints,
      },
    });
  },

  // ---------- analytics & AI ----------
  async getEmissionAnalytics(
    groupBy: EmissionAnalytics["groupBy"],
  ): Promise<EmissionAnalytics> {
    if (groupBy === "department") {
      return delay({ groupBy, items: DEPARTMENT_EMISSION });
    }
    // 14-day forecast continuing the last observed saved value with mild growth.
    const last = DAILY_EMISSION[DAILY_EMISSION.length - 1];
    const lastDate = new Date(last.label);
    const forecast = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i + 1);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const base = weekend ? last.savedCo2Kg * 0.4 : last.savedCo2Kg;
      return {
        label: d.toISOString().slice(0, 10),
        savedCo2Kg: Number((base * (1 + i * 0.01)).toFixed(1)),
      };
    });
    return delay({ groupBy, items: DAILY_EMISSION, forecast });
  },

  async getMonthlyPrediction(range?: DateRange): Promise<MonthlyPrediction> {
    const from = range?.from ?? "2026-06-01";
    const to = range?.to ?? "2026-06-30";
    const current = COMPANY_DASHBOARD.summary;
    const totalDays = 30;
    const daysElapsed = 20;
    const factor = totalDays / daysElapsed;
    const predictedEmissionKg = Number(
      (current.totalEmissionKg * factor).toFixed(1),
    );
    const targetEmissionKg = 15000;
    return delay({
      companyId: "cmp_001",
      period: { from, to, daysElapsed, totalDays },
      current: {
        actualEmissionKg: current.totalEmissionKg,
        savedEmissionKg: current.savedEmissionKg,
        evRate: current.evRate,
        totalTrips: current.totalTrips,
      },
      prediction: {
        predictedEmissionKg,
        predictedSavedKg: Number((current.savedEmissionKg * factor).toFixed(1)),
        predictedEvRate: current.evRate,
        confidence: 0.84,
      },
      status: {
        targetEmissionKg,
        riskLevel: predictedEmissionKg > targetEmissionKg ? "AT_RISK" : "ON_TRACK",
        gapKg: Number((predictedEmissionKg - targetEmissionKg).toFixed(1)),
      },
      model: { modelId: "monthly_regression_v1", modelType: "LINEAR_REGRESSION" },
    });
  },

  async getRecommendation(
    scope: Recommendation["scope"],
    language: Language = "en",
  ): Promise<Recommendation> {
    const en: Recommendation = {
      scope,
      summary:
        "You already use EV for most trips, but the remaining petrol trips still create most of your avoidable emissions.",
      recommendations: [
        { title: "Switch 3 petrol trips to EV next week", reason: "Directly reduces the largest avoidable source of emissions.", estimatedCo2ReductionKg: 0.78 },
        { title: "Use EV as the default for trips under 10 km", reason: "Short trips are well suited to electric motorbikes.", estimatedCo2ReductionKg: 0.52 },
        { title: "Reduce petrol rides on Mondays", reason: "Monday has your highest emission contribution.", estimatedCo2ReductionKg: 0.3 },
      ],
      nextBestAction: "Choose an electric motorbike for your next 3 commute trips.",
      model: { provider: "MOCK", model: "mock-v1" },
    };
    const vi: Recommendation = {
      scope,
      summary:
        "Bạn đã dùng xe điện cho phần lớn chuyến đi, nhưng các chuyến xe xăng còn lại vẫn tạo ra phần lớn lượng khí thải có thể tránh được.",
      recommendations: [
        { title: "Chuyển 3 chuyến xe xăng sang xe điện tuần tới", reason: "Giảm trực tiếp nguồn phát thải có thể tránh được lớn nhất.", estimatedCo2ReductionKg: 0.78 },
        { title: "Mặc định chọn xe điện cho các chuyến dưới 10 km", reason: "Các chuyến ngắn rất phù hợp với xe máy điện.", estimatedCo2ReductionKg: 0.52 },
        { title: "Giảm chuyến xe xăng vào thứ Hai", reason: "Thứ Hai là ngày bạn phát thải nhiều nhất.", estimatedCo2ReductionKg: 0.3 },
      ],
      nextBestAction: "Chọn xe máy điện cho 3 chuyến đi làm tiếp theo.",
      model: { provider: "MOCK", model: "mock-v1" },
    };
    return delay(language === "vi" ? vi : en, 500);
  },

  // ---------- rewards ----------
  async getRewards(): Promise<RewardCatalog> {
    const userPoints = EMPLOYEE_DASHBOARD.summary.greenPoints;
    return delay({
      userPoints,
      items: REWARDS.map((r) => ({
        ...r,
        eligible: userPoints >= r.requiredGreenPoints,
      })),
    });
  },

  async redeemReward(
    rewardId: string,
  ): Promise<{ redemption: Redemption; remainingGreenPoints: number }> {
    const reward = REWARDS.find((r) => r.id === rewardId) ?? REWARDS[0];
    const remaining =
      EMPLOYEE_DASHBOARD.summary.greenPoints - reward.requiredGreenPoints;
    return delay({
      redemption: {
        id: `redemption_${Date.now().toString().slice(-6)}`,
        rewardId: reward.id,
        rewardName: reward.name,
        greenPointsSpent: reward.requiredGreenPoints,
        voucherCode: `GREEN-2026-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        redeemedAt: new Date().toISOString(),
      },
      remainingGreenPoints: Math.max(0, remaining),
    });
  },

  // ---------- ESG ----------
  async getEsgReport(): Promise<EsgReport> {
    return delay(ESG_REPORT);
  },
};
