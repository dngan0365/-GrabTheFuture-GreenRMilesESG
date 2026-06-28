/**
 * Presentation formatters. Pure functions, safe for server or client.
 * All carbon math comes pre-computed from the backend — these only format.
 */

const NUMBER = new Intl.NumberFormat("en-US");
const NUMBER_1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const NUMBER_2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

/** Kilograms of CO2, switching to tonnes once it gets large. */
export function formatCo2(kg: number): string {
  if (Math.abs(kg) >= 1000) return `${NUMBER_2.format(kg / 1000)} t`;
  return `${NUMBER_1.format(kg)} kg`;
}

export function formatKg(kg: number): string {
  return `${NUMBER_1.format(kg)} kg`;
}

export function formatLiters(liters: number): string {
  return `${NUMBER_1.format(liters)} L`;
}

export function formatKm(km: number): string {
  return `${NUMBER_1.format(km)} km`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatVnd(vnd: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(vnd);
}

export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "NMT" from "Nguyen Minh Tam" — used for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(-2)
    .toUpperCase();
}
