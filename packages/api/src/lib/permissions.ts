/**
 * Permission matrices — role-based access control for entity operations.
 * v4: removed display_account, category, department, project
 */
import type { UserRole } from "../middleware/context.js";

type Op = "read" | "create" | "update" | "delete" | "restore" | "purge";

const ALL: UserRole[] = ["platform", "auditor", "admin", "user"];
const PF: UserRole[] = ["platform"];
const PF_AD: UserRole[] = ["platform", "admin"];
const AD_US: UserRole[] = ["admin", "user"];
const AD: UserRole[] = ["admin"];

export const ENTITY_PERMISSIONS: Record<string, Record<Op, UserRole[]>> = {
  role:         { read: ALL, create: PF,    update: PF,     delete: PF,    restore: PF,    purge: PF },
  user:         { read: ALL, create: PF_AD, update: PF_AD,  delete: PF_AD, restore: PF_AD, purge: PF_AD },
  book:         { read: ALL, create: AD,    update: AD,     delete: AD,    restore: AD,    purge: AD },
  account:      { read: ALL, create: AD,    update: AD,     delete: AD,    restore: AD,    purge: AD },
  counterparty: { read: ALL, create: AD_US, update: AD_US,  delete: AD,    restore: AD,    purge: AD },
  voucher:      { read: ALL, create: AD_US, update: AD_US,  delete: AD_US, restore: AD,    purge: AD },
  journal:      { read: ALL, create: AD_US, update: AD_US,  delete: AD_US, restore: AD,    purge: AD },
};

export const AUTHORITY_MATRIX: Record<UserRole, readonly UserRole[]> = {
  platform: ["platform", "admin", "user"],
  admin:    ["admin", "user"],
  user:     ["user"],
  auditor:  [],
};

export function canModifyByRole(
  userRole: UserRole,
  entityAuthorityRole: UserRole
): boolean {
  return AUTHORITY_MATRIX[userRole]?.includes(entityAuthorityRole) ?? false;
}
