export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch Manager",
  DEPARTMENT_HEAD: "Department Head",
  APPROVER: "Approver",
  VEHICLE_MANAGER: "Vehicle Manager",
  DRIVER: "Driver",
  NORMAL_USER: "Normal User",
  ACCOUNTS: "Accounts User",
  AUDITOR: "Auditor",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export type SessionUserLike = {
  id?: string | null;
  role?: string | null;
  branchId?: string | null;
};

const roleGroups = {
  platformAdmin: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  branchApprover: [ROLES.BRANCH_MANAGER, ROLES.DEPARTMENT_HEAD, ROLES.APPROVER],
  indentApprover: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_MANAGER, ROLES.DEPARTMENT_HEAD, ROLES.APPROVER],
  assignmentManager: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_MANAGER, ROLES.VEHICLE_MANAGER],
  fleetWriter: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.BRANCH_MANAGER, ROLES.VEHICLE_MANAGER],
  accountsApprover: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTS, ROLES.BRANCH_MANAGER, ROLES.APPROVER],
  lifecycleManager: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VEHICLE_MANAGER],
  reportReader: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AUDITOR, ROLES.ACCOUNTS, ROLES.BRANCH_MANAGER],
  auditReader: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AUDITOR],
} satisfies Record<string, readonly UserRole[]>;

export type RoleGroup = keyof typeof roleGroups;

export function hasRole(user: SessionUserLike | undefined | null, group: RoleGroup) {
  return Boolean(user?.role && (roleGroups[group] as readonly string[]).includes(user.role));
}

export function requireRole(user: SessionUserLike | undefined | null, group: RoleGroup) {
  return Boolean(user?.id && hasRole(user, group));
}

export function canSeeBranch(user: SessionUserLike | undefined | null, branchId?: string | null) {
  if (!user?.id) return false;
  if (hasRole(user, "platformAdmin")) return true;
  return Boolean(user.branchId && branchId && user.branchId === branchId);
}

export function scopedBranchWhere(user: SessionUserLike | undefined | null) {
  return hasRole(user, "platformAdmin") ? {} : { branchId: user?.branchId ?? undefined };
}

export function nextIndentApprovalLevel(currentLevel = 0) {
  return currentLevel + 1;
}

export function isTerminalStatus(status: string) {
  return ["REJECTED", "CANCELLED", "CLOSED"].includes(status);
}
