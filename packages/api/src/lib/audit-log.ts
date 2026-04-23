/**
 * Unified audit log helper (v4: system_log + event_log → audit_log).
 */
import { db } from "./db/index.js";
import { auditLog } from "./db/schema.js";

export interface AuditLogInput {
  userKey: number;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityKey: number;
  entityName?: string | null;
  revision?: number | null;
  summary?: string | null;
  changes?: unknown;
  sourceIp?: string | null;
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  await db.insert(auditLog).values({
    user_key: input.userKey,
    user_name: input.userName,
    user_role: input.userRole,
    action: input.action,
    entity_type: input.entityType,
    entity_key: input.entityKey,
    entity_name: input.entityName ?? null,
    revision: input.revision ?? null,
    summary: input.summary ?? null,
    changes: input.changes ?? null,
    source_ip: input.sourceIp ?? null,
  });
}
