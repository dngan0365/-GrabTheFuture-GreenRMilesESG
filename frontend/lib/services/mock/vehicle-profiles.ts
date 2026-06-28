/**
 * Vehicle profiles + carbon math for the MOCK service.
 *
 * The numbers and formulas mirror the backend (BackendSpec.md §1–2) so the
 * mock UI behaves identically to production. In Step 2 the real backend owns
 * this math; the API client just reads the returned values.
 */
import type {
  CarbonResult,
  CompareOption,
  VehicleClass,
  VehicleProfile,
  VehicleProfileId,
} from "@/types";

interface MockProfile extends VehicleProfile {
  /** Petrol baseline consumption (L/100km) — only used for fuel-saved math. */
  petrolLPer100Km: number;
  baselineProfileId: VehicleProfileId;
}

export const TREE_ABSORPTION_KG = 21.77;

export const VEHICLE_PROFILES: Record<VehicleProfileId, MockProfile> = {
  MOTORBIKE_PETRO: {
    vehicleProfileId: "MOTORBIKE_PETRO",
    displayName: "Petrol Motorbike",
    vehicleClass: "MOTORBIKE",
    powertrain: "PETRO",
    co2KgPerKm: 0.05,
    energyUsage: "2.12 L/100km",
    baselineProfileId: "MOTORBIKE_PETRO",
    petrolLPer100Km: 2.12,
  },
  MOTORBIKE_ELECTRIC: {
    vehicleProfileId: "MOTORBIKE_ELECTRIC",
    displayName: "Electric Motorbike",
    vehicleClass: "MOTORBIKE",
    powertrain: "ELECTRIC",
    co2KgPerKm: 0.024,
    energyUsage: "36.5 Wh/km",
    baselineProfileId: "MOTORBIKE_PETRO",
    petrolLPer100Km: 2.12,
  },
  CAR_4_PETRO: {
    vehicleProfileId: "CAR_4_PETRO",
    displayName: "Petrol 4-seat Car",
    vehicleClass: "CAR_4",
    powertrain: "PETRO",
    co2KgPerKm: 0.14,
    energyUsage: "6.25 L/100km",
    baselineProfileId: "CAR_4_PETRO",
    petrolLPer100Km: 6.25,
  },
  CAR_4_ELECTRIC: {
    vehicleProfileId: "CAR_4_ELECTRIC",
    displayName: "Electric 4-seat Car",
    vehicleClass: "CAR_4",
    powertrain: "ELECTRIC",
    co2KgPerKm: 0.084,
    energyUsage: "119-134.5 Wh/km",
    baselineProfileId: "CAR_4_PETRO",
    petrolLPer100Km: 6.25,
  },
  SUV_7_PETRO: {
    vehicleProfileId: "SUV_7_PETRO",
    displayName: "Petrol 7-seat / SUV",
    vehicleClass: "SUV_7",
    powertrain: "PETRO",
    co2KgPerKm: 0.22,
    energyUsage: "9.36 L/100km",
    baselineProfileId: "SUV_7_PETRO",
    petrolLPer100Km: 9.36,
  },
  SUV_7_ELECTRIC: {
    vehicleProfileId: "SUV_7_ELECTRIC",
    displayName: "Electric 7-seat / SUV",
    vehicleClass: "SUV_7",
    powertrain: "ELECTRIC",
    co2KgPerKm: 0.127,
    energyUsage: "192.5 Wh/km",
    baselineProfileId: "SUV_7_PETRO",
    petrolLPer100Km: 9.36,
  },
};

export const VEHICLE_PROFILE_LIST: VehicleProfile[] =
  Object.values(VEHICLE_PROFILES);

const round = (n: number, digits = 3) => Number(n.toFixed(digits));

/** Runtime carbon calculation for a single (distance, vehicle) pair. */
export function calculateCarbon(
  distanceKm: number,
  vehicleProfileId: VehicleProfileId,
): CarbonResult {
  const selected = VEHICLE_PROFILES[vehicleProfileId];
  const baseline = VEHICLE_PROFILES[selected.baselineProfileId];

  const baselineCo2Kg = round(distanceKm * baseline.co2KgPerKm);
  const actualCo2Kg = round(distanceKm * selected.co2KgPerKm);
  const co2SavedKg = round(Math.max(0, baselineCo2Kg - actualCo2Kg));
  const fuelSavedLiters =
    selected.powertrain === "ELECTRIC"
      ? round((distanceKm * baseline.petrolLPer100Km) / 100)
      : 0;
  const treeEquivalent = round(co2SavedKg / TREE_ABSORPTION_KG);

  return {
    baselineProfileId: selected.baselineProfileId,
    baselineCo2Kg,
    actualCo2Kg,
    co2SavedKg,
    fuelSavedLiters,
    treeEquivalent,
  };
}

export function greenPointsFor(co2SavedKg: number): number {
  return Math.round(co2SavedKg * 100);
}

export function greenScoreFor(co2SavedKg: number): number {
  return Math.round(co2SavedKg * 10);
}

/** Compare every option within a vehicle class, EV flagged as recommended. */
export function compareVehicles(
  distanceKm: number,
  vehicleClass: VehicleClass,
): CompareOption[] {
  return VEHICLE_PROFILE_LIST.filter((p) => p.vehicleClass === vehicleClass)
    .map((profile) => {
      const carbon = calculateCarbon(distanceKm, profile.vehicleProfileId);
      return {
        vehicleProfileId: profile.vehicleProfileId,
        displayName: profile.displayName,
        actualCo2Kg: carbon.actualCo2Kg,
        baselineCo2Kg: carbon.baselineCo2Kg,
        co2SavedKg: carbon.co2SavedKg,
        fuelSavedLiters: carbon.fuelSavedLiters,
        treeEquivalent: carbon.treeEquivalent,
        recommended: profile.powertrain === "ELECTRIC",
      };
    })
    .sort((a, b) => b.co2SavedKg - a.co2SavedKg);
}
