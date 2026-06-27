/**
 * Static mock fixtures for the Step-1 service. Values are demo-friendly and
 * internally consistent (EV adoption ~62%, Sales emits most, etc.) so every
 * page renders something believable.
 */
import type {
  CompanyDashboard,
  EmissionPoint,
  EmployeeDashboard,
  EsgReport,
  LeaderboardEntry,
  Reward,
  Ride,
  User,
} from "@/types";

export const DEMO_USERS: Record<string, User> = {
  "tam@greencorp.vn": {
    id: "usr_001",
    name: "Nguyen Minh Tam",
    email: "tam@greencorp.vn",
    role: "EMPLOYEE",
    companyId: "cmp_001",
    companyName: "GreenCorp Vietnam",
    department: "Engineering",
  },
  "admin@greencorp.vn": {
    id: "usr_admin",
    name: "GreenCorp Admin",
    email: "admin@greencorp.vn",
    role: "COMPANY_ADMIN",
    companyId: "cmp_001",
    companyName: "GreenCorp Vietnam",
    department: "Operations",
  },
};

/** Demo passwords, kept separate from the user objects. */
export const DEMO_PASSWORDS: Record<string, string> = {
  "tam@greencorp.vn": "password123",
  "admin@greencorp.vn": "password123",
};

export const EMPLOYEE_DASHBOARD: EmployeeDashboard = {
  employee: { id: "usr_001", name: "Nguyen Minh Tam", department: "Engineering" },
  summary: {
    todayEmissionKg: 0.295,
    monthEmissionKg: 21.0,
    monthBaselineEmissionKg: 34.8,
    savedEmissionKg: 13.8,
    fuelSavedLiters: 4.2,
    treeEquivalent: 0.634,
    greenPoints: 1380,
    greenScore: 138,
    rank: 8,
  },
  tripStats: {
    totalTrips: 24,
    evTrips: 16,
    petrolTrips: 8,
    evRate: 66.7,
    totalDistanceKm: 318.4,
    evDistanceKm: 204.1,
    petrolDistanceKm: 114.3,
  },
};

export const COMPANY_DASHBOARD: CompanyDashboard = {
  company: { id: "cmp_001", name: "Company A" },
  summary: {
    employees: 524,
    totalTrips: 4820,
    evTrips: 2988,
    petrolTrips: 1832,
    evRate: 62.0,
    totalDistanceKm: 38240.5,
    totalEmissionKg: 12540.0,
    baselineEmissionKg: 15080.0,
    savedEmissionKg: 2540.0,
    fuelSavedLiters: 3620.5,
    treeEquivalent: 116.7,
    moneySavedVnd: 15240000,
  },
  topDepartments: [
    { department: "Sales", savedEmissionKg: 820.4, evRate: 68.2 },
    { department: "Engineering", savedEmissionKg: 610.8, evRate: 64.1 },
    { department: "Operations", savedEmissionKg: 540.2, evRate: 60.5 },
    { department: "HR", savedEmissionKg: 312.1, evRate: 71.0 },
  ],
};

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "usr_101", name: "Le Hoang Anh", department: "Sales", savedCo2Kg: 52.0, greenPoints: 5200, evTrips: 41, totalTrips: 48, evRate: 85.4 },
  { rank: 2, userId: "usr_102", name: "Pham Quoc Bao", department: "Operations", savedCo2Kg: 48.0, greenPoints: 4800, evTrips: 37, totalTrips: 46, evRate: 80.4 },
  { rank: 3, userId: "usr_103", name: "Vo Thi Mai", department: "Engineering", savedCo2Kg: 44.5, greenPoints: 4450, evTrips: 35, totalTrips: 44, evRate: 79.5 },
  { rank: 4, userId: "usr_104", name: "Dang Van Hung", department: "Sales", savedCo2Kg: 39.2, greenPoints: 3920, evTrips: 31, totalTrips: 42, evRate: 73.8 },
  { rank: 5, userId: "usr_105", name: "Bui Thu Ha", department: "HR", savedCo2Kg: 35.8, greenPoints: 3580, evTrips: 29, totalTrips: 37, evRate: 78.4 },
  { rank: 6, userId: "usr_106", name: "Nguyen Tien Dat", department: "Engineering", savedCo2Kg: 28.4, greenPoints: 2840, evTrips: 24, totalTrips: 35, evRate: 68.6 },
  { rank: 7, userId: "usr_107", name: "Tran Gia Han", department: "Operations", savedCo2Kg: 19.6, greenPoints: 1960, evTrips: 18, totalTrips: 29, evRate: 62.1 },
  { rank: 8, userId: "usr_001", name: "Nguyen Minh Tam", department: "Engineering", savedCo2Kg: 13.8, greenPoints: 1380, evTrips: 16, totalTrips: 24, evRate: 66.7 },
  { rank: 9, userId: "usr_109", name: "Do Khanh Linh", department: "Sales", savedCo2Kg: 9.4, greenPoints: 940, evTrips: 11, totalTrips: 22, evRate: 50.0 },
  { rank: 10, userId: "usr_110", name: "Hoang Minh Khoi", department: "HR", savedCo2Kg: 6.1, greenPoints: 610, evTrips: 7, totalTrips: 18, evRate: 38.9 },
];

export const RIDE_HISTORY: Ride[] = [
  { id: "ride_001", date: "2026-06-27", originName: "District 1, HCMC", destinationName: "Thu Duc, HCMC", distanceKm: 12.3, vehicleProfileId: "MOTORBIKE_ELECTRIC", vehicleDisplayName: "Electric Motorbike", powertrain: "ELECTRIC", purpose: "COMMUTE", priceVnd: 92000, actualCo2Kg: 0.295, baselineCo2Kg: 0.615, co2SavedKg: 0.32, greenPointsAdded: 32, status: "COMPLETED" },
  { id: "ride_002", date: "2026-06-26", originName: "Binh Thanh, HCMC", destinationName: "District 3, HCMC", distanceKm: 8.1, vehicleProfileId: "MOTORBIKE_PETRO", vehicleDisplayName: "Petrol Motorbike", powertrain: "PETRO", purpose: "COMMUTE", priceVnd: 51000, actualCo2Kg: 0.405, baselineCo2Kg: 0.405, co2SavedKg: 0, greenPointsAdded: 0, status: "COMPLETED" },
  { id: "ride_003", date: "2026-06-25", originName: "District 7, HCMC", destinationName: "District 1, HCMC", distanceKm: 15.6, vehicleProfileId: "CAR_4_ELECTRIC", vehicleDisplayName: "Electric 4-seat Car", powertrain: "ELECTRIC", purpose: "BUSINESS", priceVnd: 168000, actualCo2Kg: 1.31, baselineCo2Kg: 2.184, co2SavedKg: 0.874, greenPointsAdded: 87, status: "COMPLETED" },
  { id: "ride_004", date: "2026-06-24", originName: "Tan Binh, HCMC", destinationName: "District 5, HCMC", distanceKm: 9.8, vehicleProfileId: "MOTORBIKE_ELECTRIC", vehicleDisplayName: "Electric Motorbike", powertrain: "ELECTRIC", purpose: "COMMUTE", priceVnd: 64000, actualCo2Kg: 0.235, baselineCo2Kg: 0.49, co2SavedKg: 0.255, greenPointsAdded: 26, status: "COMPLETED" },
  { id: "ride_005", date: "2026-06-23", originName: "District 2, HCMC", destinationName: "District 1, HCMC", distanceKm: 11.2, vehicleProfileId: "SUV_7_PETRO", vehicleDisplayName: "Petrol 7-seat / SUV", powertrain: "PETRO", purpose: "OTHER", priceVnd: 145000, actualCo2Kg: 2.464, baselineCo2Kg: 2.464, co2SavedKg: 0, greenPointsAdded: 0, status: "COMPLETED" },
  { id: "ride_006", date: "2026-06-22", originName: "Phu Nhuan, HCMC", destinationName: "Thu Duc, HCMC", distanceKm: 18.4, vehicleProfileId: "CAR_4_ELECTRIC", vehicleDisplayName: "Electric 4-seat Car", powertrain: "ELECTRIC", purpose: "BUSINESS", priceVnd: 196000, actualCo2Kg: 1.546, baselineCo2Kg: 2.576, co2SavedKg: 1.03, greenPointsAdded: 103, status: "COMPLETED" },
];

export const REWARDS: Reward[] = [
  { id: "reward_001", name: "Green Commuter Voucher", description: "Redeem a 50,000 VND ride voucher.", requiredGreenPoints: 1000, valueVnd: 50000, eligible: true },
  { id: "reward_002", name: "Top Green Employee Badge", description: "Monthly recognition badge for sustainability leaders.", requiredGreenPoints: 2000, valueVnd: 0, eligible: false },
  { id: "reward_003", name: "EV Weekend Pass", description: "Free electric ride credits for the weekend.", requiredGreenPoints: 1500, valueVnd: 120000, eligible: false },
  { id: "reward_004", name: "Coffee On Us", description: "A 35,000 VND coffee voucher for green commuters.", requiredGreenPoints: 700, valueVnd: 35000, eligible: true },
];

/** 14 days of company emission series, with a weekend dip + mild trend. */
export const DAILY_EMISSION: EmissionPoint[] = Array.from({ length: 14 }).map(
  (_, i) => {
    const day = new Date(2026, 5, 14 + i); // Jun 14..27 2026
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const base = weekend ? 180 : 430;
    const trend = i * 4;
    const totalTrips = Math.round((weekend ? 70 : 162) + i);
    const evTrips = Math.round(totalTrips * 0.62);
    const actualCo2Kg = Number((base + trend).toFixed(1));
    const baselineCo2Kg = Number((actualCo2Kg * 1.21).toFixed(1));
    return {
      label: day.toISOString().slice(0, 10),
      totalTrips,
      evTrips,
      petrolTrips: totalTrips - evTrips,
      totalDistanceKm: Number((totalTrips * 7.8).toFixed(1)),
      actualCo2Kg,
      baselineCo2Kg,
      savedCo2Kg: Number((baselineCo2Kg - actualCo2Kg).toFixed(1)),
      evRate: Number(((evTrips / totalTrips) * 100).toFixed(1)),
    };
  },
);

export const DEPARTMENT_EMISSION: EmissionPoint[] = [
  { label: "Sales", totalTrips: 1320, evTrips: 920, petrolTrips: 400, totalDistanceKm: 10240, actualCo2Kg: 3210.4, baselineCo2Kg: 4030.8, savedCo2Kg: 820.4, evRate: 69.7 },
  { label: "Engineering", totalTrips: 980, evTrips: 610, petrolTrips: 370, totalDistanceKm: 8120, actualCo2Kg: 2400.0, baselineCo2Kg: 3010.8, savedCo2Kg: 610.8, evRate: 62.2 },
  { label: "Operations", totalTrips: 870, evTrips: 520, petrolTrips: 350, totalDistanceKm: 7010, actualCo2Kg: 2180.0, baselineCo2Kg: 2720.2, savedCo2Kg: 540.2, evRate: 59.8 },
  { label: "HR", totalTrips: 410, evTrips: 290, petrolTrips: 120, totalDistanceKm: 3120, actualCo2Kg: 980.0, baselineCo2Kg: 1292.1, savedCo2Kg: 312.1, evRate: 70.7 },
];

export const ESG_REPORT: EsgReport = {
  reportType: "SCOPE_3_MOBILITY",
  companyId: "cmp_001",
  period: { from: "2026-06-01", to: "2026-06-30" },
  summary: {
    employees: 524,
    totalTrips: 4820,
    evTrips: 2988,
    petrolTrips: 1832,
    evRate: 62.0,
    totalDistanceKm: 38240.5,
    baselineEmissionKg: 15080.0,
    actualEmissionKg: 12540.0,
    savedEmissionKg: 2540.0,
    fuelSavedLiters: 3620.5,
    treeEquivalent: 116.7,
  },
  methodology: {
    runtimeFormula: "distanceKm * co2KgPerKm",
    savedFormula: "max(0, baselineCo2Kg - actualCo2Kg)",
    baselineLogic:
      "EV vehicles are compared against petrol vehicles from the same class.",
    gridEmissionFactor: "Vietnam 2023 grid factor: 0.6592 kg CO2/kWh",
    sources: [
      "Cục Đăng kiểm Việt Nam",
      "Bộ TNMT Quyết định 2626/QĐ-BTNMT",
      "Cục Biến đổi khí hậu",
    ],
  },
  vehicleProfiles: [
    { vehicleProfileId: "MOTORBIKE_PETRO", energyUsage: "2.12 L/100km", co2KgPerKm: 0.05 },
    { vehicleProfileId: "MOTORBIKE_ELECTRIC", energyUsage: "36.5 Wh/km", co2KgPerKm: 0.024 },
    { vehicleProfileId: "CAR_4_PETRO", energyUsage: "6.25 L/100km", co2KgPerKm: 0.14 },
    { vehicleProfileId: "CAR_4_ELECTRIC", energyUsage: "119-134.5 Wh/km", co2KgPerKm: 0.084 },
    { vehicleProfileId: "SUV_7_PETRO", energyUsage: "9.36 L/100km", co2KgPerKm: 0.22 },
    { vehicleProfileId: "SUV_7_ELECTRIC", energyUsage: "192.5 Wh/km", co2KgPerKm: 0.127 },
  ],
};
