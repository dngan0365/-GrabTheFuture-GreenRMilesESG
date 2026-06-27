import {
  BarChart3,
  FileText,
  Gift,
  LayoutDashboard,
  Route,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit = all roles. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trip Calculator", href: "/trip-calculator", icon: Route },
  { label: "Leaderboard", href: "/employees", icon: Trophy },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["COMPANY_ADMIN"] },
  { label: "ESG Report", href: "/esg-report", icon: FileText, roles: ["COMPANY_ADMIN"] },
  { label: "Rewards", href: "/rewards", icon: Gift, roles: ["EMPLOYEE"] },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function navItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
