/**
 * Audit log query route.
 * v4: unified audit_log replaces v1's separate system_log + event_log.
 */
import { createApp } from "../../lib/create-app.js";
import { createRoute } from "@hono/zod-openapi";
import { db } from "../../lib/db/index.js";
import { sql } from "drizzle-orm";
import {
  errorSchema,
  paginatedSchema,
  auditLogResponseSchema,
  auditLogQuerySchema,
} from "../../lib/validators.js";
import { requireAuth, requireRole } from "../../middleware/guards.js";

const S = "data_stockflow";

const app = createApp();

app.use("*", requireAuth());

const list = createRoute({
  method: "get",
  path: "/",
  tags: ["Audit Logs"],
  summary: "Query audit logs",
  request: { query: auditLogQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: paginatedSchema(auditLogResponseSchema),
        },
      },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

app.use(list.getRoutingPath(), requireRole("platform", "admin", "auditor"));
app.openapi(list, async (c) => {
  const query = c.req.valid("query");
  const limit = Math.min(Number(query.limit || 50), 200);

  const conditions: ReturnType<typeof sql>[] = [];

  if (query.entity_type) {
    conditions.push(sql`entity_type = ${query.entity_type}`);
  }

  if (query.action) {
    conditions.push(sql`action = ${query.action}`);
  }

  if (query.cursor) {
    try {
      const plain = Buffer.from(query.cursor, "base64url").toString();
      const sep = plain.indexOf("|");
      if (sep > 0) {
        const cursorTime = plain.slice(0, sep);
        const cursorUuid = plain.slice(sep + 1);
        conditions.push(
          sql`(created_at, uuid) < (${cursorTime}::timestamptz, ${cursorUuid}::uuid)`,
        );
      }
    } catch { /* invalid cursor */ }
  }

  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  interface AuditLogRow {
    uuid: string;
    user_key: number;
    user_name: string;
    user_role: string;
    action: string;
    entity_type: string;
    entity_key: number;
    entity_name: string | null;
    revision: number | null;
    summary: string | null;
    changes: unknown | null;
    source_ip: string | null;
    created_at: Date;
  }

  const rawRows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".audit_log`)}
    ${whereClause}
    ORDER BY created_at DESC, uuid DESC
    LIMIT ${limit}
  `);
  const rows = rawRows as unknown as AuditLogRow[];

  const data = rows.map((r) => ({
    uuid: r.uuid,
    user_name: r.user_name,
    user_role: r.user_role,
    action: r.action,
    entity_type: r.entity_type,
    entity_key: r.entity_key,
    entity_name: r.entity_name,
    revision: r.revision,
    summary: r.summary,
    changes: r.changes,
    source_ip: r.source_ip,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));

  const nextCursor =
    rows.length === limit
      ? Buffer.from(
          `${rows[rows.length - 1].created_at instanceof Date ? rows[rows.length - 1].created_at.toISOString() : String(rows[rows.length - 1].created_at)}|${rows[rows.length - 1].uuid}`,
        ).toString("base64url")
      : null;

  return c.json({ data, next_cursor: nextCursor }, 200);
});

export default app;
