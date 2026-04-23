import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { canModifyByRole } from "./permissions.js";
import type { UserRole } from "../middleware/context.js";

const S = "data_stockflow";

const codeCache = new Map<number, UserRole>();

export async function getRoleCode(
  roleKey: number
): Promise<UserRole | null> {
  const cached = codeCache.get(roleKey);
  if (cached !== undefined) return cached;

  const rows = await db.execute(sql`
    SELECT code FROM ${sql.raw(`"${S}".current_role`)}
    WHERE key = ${roleKey} LIMIT 1
  `);
  if (rows.length === 0) return null;
  const code = (rows[0] as unknown as { code: string }).code as UserRole;
  codeCache.set(roleKey, code);
  return code;
}

export async function canModify(
  userRoleKey: number,
  entityAuthorityRoleKey: number
): Promise<boolean> {
  const userCode = await getRoleCode(userRoleKey);
  const entityCode = await getRoleCode(entityAuthorityRoleKey);
  if (!userCode || !entityCode) return false;
  return canModifyByRole(userCode, entityCode);
}

export async function authorityCheck(
  userRoleKey: number,
  entityAuthorityRoleKey: number,
  entityLabel: string
): Promise<string | null> {
  const ok = await canModify(userRoleKey, entityAuthorityRoleKey);
  return ok ? null : `Insufficient authority to modify this ${entityLabel}`;
}
