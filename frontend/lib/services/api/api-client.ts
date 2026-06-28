/**
 * LIVE API client (Step 2) — implements GreenMilesApi against the backend.
 *
 * The backend contract diverges from the UI's domain model in places, so this
 * layer maps/【composes】 responses into the exact domain types the UI expects:
 *  - Responses are flat (no { data } envelope).
 *  - There is no employee-dashboard endpoint, so it is COMPOSED from
 *    /auth/me + /rewards + /rides + /analytics/leaderboard.
 *  - The backend dashboard/esg/leaderboard omit some fields (topDepartments,
 *    methodology, per-user savedCo2/evRate); we fill those with sensible
 *    defaults or static reference data and keep the UI tolerant.
 */
import type {
  AuthSession,
  CarbonResult,
  CompanyDashboard,
  CompareOption,
  DateRange,
  EmissionAnalytics,
  EmissionPoint,
  EmployeeDashboard,
  EsgReport,
  Language,
  Leaderboard,
  LeaderboardMetric,
  MonthlyPrediction,
  PlacePrediction,
  Recommendation,
  Redemption,
  RewardCatalog,
  Ride,
  RideReward,
  RouteDistance,
  User,
  VehicleClass,
  VehicleProfile,
  VehicleProfileId,
} from "@/types";
import type { BookRideInput, GreenMilesApi, LoginInput } from "../contract";
import { ESG_REPORT } from "../mock/fixtures";
import { request } from "./http";

// ---- live response shapes (only the fields we read) ----
interface Envelope<T> {
  items: T[];
}
interface LiveSummary {
  rideCount: number;
  distanceKm: number;
  actualCo2Kg: number;
  baselineCo2Kg: number;
  co2SavedKg: number;
  fuelSavedLiters: number;
  treeEquivalent: number;
  greenPointsIssued: number;
  evRideRate: number; // 0..1
}
interface LiveRewardItem {
  id: string;
  name: string;
  description: string;
  requiredGreenPoints: number;
  valueVnd: number;
  redeemable: boolean;
}

const PETROL_PRICE_VND_PER_LITER = 24000;

/** DateRange -> query object (TS needs a plain index-signature literal). */
function rangeQuery(range?: DateRange) {
  return range ? { from: range.from, to: range.to } : undefined;
}

export const apiClient: GreenMilesApi = {
  // ---------- auth ----------
  login(input: LoginInput): Promise<AuthSession> {
    return request<AuthSession>("/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  async logout(): Promise<void> {
    try {
      await request("/auth/logout", { method: "POST", body: {} });
    } catch {
      /* logout is best-effort */
    }
  },

  getCurrentUser(): Promise<User> {
    return request<User>("/auth/me");
  },

  // ---------- vehicles & carbon ----------
  async getVehicleProfiles(): Promise<VehicleProfile[]> {
    const res = await request<Envelope<VehicleProfile>>("/carbon/vehicles");
    return res.items;
  },

  getDistance(
    originName: string,
    destinationName: string,
    vehicle = "car",
  ): Promise<RouteDistance> {
    return request<RouteDistance>("/carbon/distance", {
      method: "POST",
      body: { originName, destinationName, vehicle },
    });
  },

  async searchPlaces(input: string): Promise<PlacePrediction[]> {
    if (input.trim().length < 2) return [];
    const res = await request<{ predictions: PlacePrediction[] }>(
      "/carbon/places/autocomplete",
      { query: { input } },
    );
    return res.predictions;
  },

  async calculateCarbon(
    distanceKm: number,
    vehicleProfileId: VehicleProfileId,
  ): Promise<CarbonResult> {
    const res = await request<{
      result: Omit<CarbonResult, "baselineProfileId">;
      baselineVehicle: { vehicleProfileId: string };
    }>("/carbon/calculate", {
      method: "POST",
      body: { distanceKm, vehicleProfileId },
    });
    return { ...res.result, baselineProfileId: res.baselineVehicle.vehicleProfileId };
  },

  async compareVehicles(
    distanceKm: number,
    vehicleClass: VehicleClass,
  ): Promise<CompareOption[]> {
    const res = await request<{ options: CompareOption[] }>("/carbon/compare", {
      method: "POST",
      body: { distanceKm, vehicleClass },
    });
    return res.options;
  },

  // ---------- rides ----------
  async bookRide(
    input: BookRideInput,
  ): Promise<{ ride: Ride; carbon: CarbonResult }> {
    const res = await request<{
      ride: Ride;
      carbon?: CarbonResult;
      carbonEstimate?: CarbonResult;
    }>("/rides", { method: "POST", body: input });
    return { ride: res.ride, carbon: (res.carbon ?? res.carbonEstimate)! };
  },

  async getRideHistory(): Promise<Ride[]> {
    const res = await request<Envelope<Ride>>("/rides");
    return res.items;
  },

  async completeRide(
    rideId: string,
  ): Promise<{ ride: Ride; carbon: CarbonResult; reward: RideReward }> {
    return request(`/rides/${rideId}/complete`, { method: "POST", body: {} });
  },

  // ---------- dashboards ----------
  async getEmployeeDashboard(): Promise<EmployeeDashboard> {
    // Composed: no dedicated employee-dashboard endpoint on the backend.
    const [me, rewards, rides, leaderboard] = await Promise.all([
      request<User>("/auth/me"),
      request<{ balance: { greenPoints: number; greenScore: number } }>("/rewards"),
      request<Envelope<Ride>>("/rides"),
      request<Envelope<{ userId: string; rank: number }>>("/analytics/leaderboard"),
    ]);

    const items = rides.items;
    const evTrips = items.filter((r) => r.powertrain === "ELECTRIC").length;
    const totalDistanceKm = items.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
    const evDistanceKm = items
      .filter((r) => r.powertrain === "ELECTRIC")
      .reduce((s, r) => s + (r.distanceKm ?? 0), 0);
    const savedEmissionKg = items.reduce((s, r) => s + (r.co2SavedKg ?? 0), 0);
    const actualEmissionKg = items.reduce((s, r) => s + (r.actualCo2Kg ?? 0), 0);
    const rank =
      leaderboard.items.find((e) => e.userId === me.id)?.rank ?? 0;

    return {
      employee: { id: me.id, name: me.name, department: me.department },
      summary: {
        todayEmissionKg: 0,
        monthEmissionKg: round(actualEmissionKg),
        monthBaselineEmissionKg: round(actualEmissionKg + savedEmissionKg),
        savedEmissionKg: round(savedEmissionKg),
        fuelSavedLiters: 0,
        treeEquivalent: round(savedEmissionKg / 21.77),
        greenPoints: rewards.balance.greenPoints,
        greenScore: rewards.balance.greenScore,
        rank,
      },
      tripStats: {
        totalTrips: items.length,
        evTrips,
        petrolTrips: items.length - evTrips,
        evRate: items.length ? round((evTrips / items.length) * 100, 1) : 0,
        totalDistanceKm: round(totalDistanceKm, 1),
        evDistanceKm: round(evDistanceKm, 1),
        petrolDistanceKm: round(totalDistanceKm - evDistanceKm, 1),
      },
    };
  },

  async getCompanyDashboard(range?: DateRange): Promise<CompanyDashboard> {
    const [dash, leaderboard, me] = await Promise.all([
      request<{ summary: LiveSummary }>("/analytics/dashboard", {
        query: rangeQuery(range),
      }),
      request<Envelope<unknown>>("/analytics/leaderboard"),
      request<User>("/auth/me"),
    ]);
    const s = dash.summary;
    return {
      company: { id: me.companyId, name: me.companyName ?? "Company" },
      summary: {
        employees: leaderboard.items.length,
        totalTrips: s.rideCount,
        evTrips: Math.round(s.rideCount * s.evRideRate),
        petrolTrips: s.rideCount - Math.round(s.rideCount * s.evRideRate),
        evRate: round(s.evRideRate * 100, 1),
        totalDistanceKm: s.distanceKm,
        totalEmissionKg: s.actualCo2Kg,
        baselineEmissionKg: s.baselineCo2Kg,
        savedEmissionKg: s.co2SavedKg,
        fuelSavedLiters: s.fuelSavedLiters,
        treeEquivalent: s.treeEquivalent,
        moneySavedVnd: Math.round(s.fuelSavedLiters * PETROL_PRICE_VND_PER_LITER),
      },
      topDepartments: [], // backend does not expose department breakdown
    };
  },

  async getLeaderboard(metric: LeaderboardMetric = "savedCo2Kg"): Promise<Leaderboard> {
    const res = await request<
      Envelope<{
        rank: number;
        userId: string;
        name: string;
        greenScore: number;
        greenPoints: number;
      }>
    >("/analytics/leaderboard");
    const items = res.items.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      name: e.name,
      department: undefined,
      // Backend leaderboard exposes points + score; CO2/EV metrics are not
      // available per-user, so they default to 0 and are not shown.
      savedCo2Kg: 0,
      greenPoints: e.greenPoints,
      greenScore: e.greenScore,
      evTrips: 0,
      totalTrips: 0,
      evRate: 0,
    }));
    return { metric, items };
  },

  // ---------- analytics & AI ----------
  async getEmissionAnalytics(
    groupBy: EmissionAnalytics["groupBy"],
    range?: DateRange,
  ): Promise<EmissionAnalytics> {
    if (groupBy === "department") {
      const res = await request<{ items: (EmissionPoint & { evRate: number })[] }>(
        "/analytics/by-department",
        { query: rangeQuery(range) },
      );
      // Backend returns evRate as a 0..1 fraction; the UI expects a percentage.
      return {
        groupBy,
        items: res.items.map((p) => ({ ...p, evRate: round(p.evRate * 100, 1) })),
      };
    }
    if (groupBy !== "day") return { groupBy, items: [] };

    const res = await request<{
      items: {
        date: string;
        actualCo2Kg: number;
        co2SavedKg: number;
        rideCount: number;
        evTrips: number;
        evRate: number;
      }[];
      forecast?: { date: string; savedCo2Kg: number }[];
    }>("/analytics/trends", { query: rangeQuery(range) });

    return {
      groupBy,
      items: res.items.map((p) => ({
        label: p.date,
        totalTrips: p.rideCount,
        evTrips: p.evTrips,
        petrolTrips: p.rideCount - p.evTrips,
        totalDistanceKm: 0,
        actualCo2Kg: p.actualCo2Kg,
        baselineCo2Kg: round(p.actualCo2Kg + p.co2SavedKg),
        savedCo2Kg: p.co2SavedKg,
        evRate: round(p.evRate * 100, 1),
      })),
      forecast: (res.forecast ?? []).map((f) => ({
        label: f.date,
        savedCo2Kg: f.savedCo2Kg,
      })),
    };
  },

  async getMonthlyPrediction(range?: DateRange): Promise<MonthlyPrediction> {
    const res = await request<{
      period: { from: string; to: string };
      current: LiveSummary;
      prediction: {
        monthEndEmissionKg: number;
        monthEndSavedKg: number;
        predictedEvRate: number;
      };
      model: { id: string; type: string; confidence: number };
    }>("/analytics/predictions/month-end", { method: "POST", body: range ?? {} });

    const target = round(res.prediction.monthEndEmissionKg * 1.05);
    return {
      companyId: "",
      period: {
        from: res.period.from,
        to: res.period.to,
        daysElapsed: 0,
        totalDays: 0,
      },
      current: {
        actualEmissionKg: res.current.actualCo2Kg,
        savedEmissionKg: res.current.co2SavedKg,
        evRate: round(res.current.evRideRate * 100, 1),
        totalTrips: res.current.rideCount,
      },
      prediction: {
        predictedEmissionKg: res.prediction.monthEndEmissionKg,
        predictedSavedKg: res.prediction.monthEndSavedKg,
        predictedEvRate: round(res.prediction.predictedEvRate * 100, 1),
        confidence: res.model.confidence,
      },
      status: {
        targetEmissionKg: target,
        riskLevel: res.prediction.monthEndEmissionKg > target ? "AT_RISK" : "ON_TRACK",
        gapKg: round(res.prediction.monthEndEmissionKg - target),
      },
      model: { modelId: res.model.id, modelType: res.model.type },
    };
  },

  async getRecommendation(
    scope: Recommendation["scope"],
    language: Language = "en",
    range?: DateRange,
  ): Promise<Recommendation> {
    const res = await request<{
      scope: Recommendation["scope"];
      summary: string;
      recommendations: Recommendation["recommendations"];
      nextBestAction: string;
      model: { provider: string; name?: string; model?: string };
    }>("/analytics/recommendations", {
      method: "POST",
      body: { scope, language, ...(range ?? {}) },
    });
    return {
      scope: res.scope,
      summary: res.summary,
      recommendations: res.recommendations,
      nextBestAction: res.nextBestAction,
      model: { provider: res.model.provider, model: res.model.model ?? res.model.name ?? "" },
    };
  },

  // ---------- rewards ----------
  async getRewards(): Promise<RewardCatalog> {
    const res = await request<{
      items: LiveRewardItem[];
      balance: { greenPoints: number };
    }>("/rewards");
    return {
      userPoints: res.balance.greenPoints,
      items: res.items.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        requiredGreenPoints: r.requiredGreenPoints,
        valueVnd: r.valueVnd,
        eligible: r.redeemable,
      })),
    };
  },

  async redeemReward(
    rewardId: string,
  ): Promise<{ redemption: Redemption; remainingGreenPoints: number }> {
    // Backend returns a FLAT payload (no `redemption` wrapper).
    const res = await request<{
      redemptionId: string;
      rewardId: string;
      greenPointsSpent: number;
      remainingGreenPoints: number;
      voucherCode: string | null;
    }>("/rewards/redeem", { method: "POST", body: { rewardId } });
    return {
      redemption: {
        id: res.redemptionId,
        rewardId: res.rewardId,
        rewardName: "",
        greenPointsSpent: res.greenPointsSpent,
        voucherCode: res.voucherCode ?? "",
        redeemedAt: new Date().toISOString(),
      },
      remainingGreenPoints: res.remainingGreenPoints,
    };
  },

  // ---------- ESG ----------
  async getEsgReport(range?: DateRange): Promise<EsgReport> {
    const res = await request<{
      companyId: string;
      period: { from: string; to: string };
      metrics: LiveSummary;
    }>("/analytics/esg-report", { query: rangeQuery(range) });
    const m = res.metrics;
    return {
      reportType: "SCOPE_3_MOBILITY",
      companyId: res.companyId,
      period: res.period,
      summary: {
        employees: 0,
        totalTrips: m.rideCount,
        evTrips: Math.round(m.rideCount * m.evRideRate),
        petrolTrips: m.rideCount - Math.round(m.rideCount * m.evRideRate),
        evRate: round(m.evRideRate * 100, 1),
        totalDistanceKm: m.distanceKm,
        baselineEmissionKg: m.baselineCo2Kg,
        actualEmissionKg: m.actualCo2Kg,
        savedEmissionKg: m.co2SavedKg,
        fuelSavedLiters: m.fuelSavedLiters,
        treeEquivalent: m.treeEquivalent,
      },
      // Methodology + factor table are static reference data (reused from spec).
      methodology: ESG_REPORT.methodology,
      vehicleProfiles: ESG_REPORT.vehicleProfiles,
    };
  },
};

function round(n: number, digits = 3): number {
  return Number(n.toFixed(digits));
}
