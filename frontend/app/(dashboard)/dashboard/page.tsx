"use client";

import { CompanyDashboardView } from "@/components/dashboard/CompanyDashboardView";
import { EmployeeDashboardView } from "@/components/dashboard/EmployeeDashboardView";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return user.role === "COMPANY_ADMIN" ? (
    <CompanyDashboardView companyName={user.companyName ?? "Company"} />
  ) : (
    <EmployeeDashboardView name={user.name} />
  );
}
