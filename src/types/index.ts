// ─────────────────────────────────────────────────────────────────────────────
// Shared application types
// ─────────────────────────────────────────────────────────────────────────────

// Extended session user with VFM-specific fields
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, Record<string, boolean>>;
  branchId?: string;
  employeeId?: string;
}

// Status badge variants
export type BadgeVariant =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "gray"
  | "gold"
  | "maroon";

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard KPI card
export interface KpiCard {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: BadgeVariant;
  icon?: string;
  href?: string;
}

// Sidebar navigation item
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
  permission?: { module: string; action: string };
}

// Approval action
export type ApprovalAction = "APPROVE" | "REJECT" | "CORRECTION";

// Vehicle life history entry (timeline)
export interface LifeHistoryEntry {
  id: string;
  date: Date;
  type:
    | "FUEL"
    | "SERVICE"
    | "REPAIR"
    | "TYRE"
    | "ACCIDENT"
    | "DOCUMENT"
    | "INDENT"
    | "DRIVER_CHANGE"
    | "STATUS_CHANGE";
  title: string;
  description?: string;
  amount?: number;
  km?: number;
  enteredBy?: string;
}
