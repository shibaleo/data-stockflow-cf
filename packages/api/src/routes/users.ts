import { createApp } from "../lib/create-app.js";
import { db } from "../lib/db/index.js";
import { sql } from "drizzle-orm";
import { user } from "../lib/db/schema.js";
import { listCurrent, getCurrent, getMaxRevision, listHistory, decodeCursor, encodeCursor } from "../lib/append-only.js";
import { userResponseSchema, createUserSchema, updateUserSchema } from "../lib/validators.js";
import { requireAuth, requireRole } from "../middleware/guards.js";
import { recordAuditLog } from "../lib/audit-log.js";
import { computeMasterHashes } from "../lib/entity-hash.js";
import { createMapper, defineCrudRoutes } from "../lib/crud-factory.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/api-keys.js";

type CurrentUser = {
  key: number; revision: number; email: string;
  external_id: string | null; code: string; name: string; type: string | null;
  role_key: number; is_active: boolean; created_at: Date | string;
  revision_hash: string; created_by: number;
};

const S = "data_stockflow";
const app = createApp();
app.use("*", requireAuth());

const mapUser = createMapper<CurrentUser>([], ["role_key"]);

const routes = defineCrudRoutes("Users", "userId", userResponseSchema, createUserSchema, updateUserSchema);

function logAudit(c: { get: (k: string) => unknown; req: { header: (k: string) => string | undefined } }, opts: {
  action: string; entityType: string; entityKey: number; entityName?: string;
  revision?: number; summary: string;
}) {
  recordAuditLog({
    userKey: c.get("userKey") as number,
    userName: c.get("userName") as string,
    userRole: c.get("userRole") as string,
    action: opts.action,
    entityType: opts.entityType,
    entityKey: opts.entityKey,
    entityName: opts.entityName,
    revision: opts.revision,
    summary: opts.summary,
    sourceIp: c.req.header("x-forwarded-for") ?? null,
  }).catch(console.error);
}

app.openapi(routes.list, async (c) => {
  const query = c.req.valid("query");
  const limit = Math.min(Number(query.limit || 100), 200);
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
  const rows = await listCurrent<CurrentUser>("current_user", null, { limit, cursor });
  const nextCursor = rows.length === limit ? encodeCursor(rows[rows.length - 1]) : null;
  return c.json({ data: rows.map(mapUser), next_cursor: nextCursor }, 200);
});

/** GET /users/me — current authenticated user */
app.get("/me", async (c) => {
  const row = await getCurrent<CurrentUser>("current_user", { key: c.get("userKey") });
  if (!row) return c.json({ error: "Not found" }, 404);
  const roleCode = c.get("userRole");
  let roleName: string = roleCode;
  let roleColor: string | null = null;
  try {
    const roleRows = await db.execute(sql`
      SELECT r.key, r.name FROM ${sql.raw(`"${S}".current_role`)} r WHERE r.code = ${roleCode} LIMIT 1
    `);
    if (roleRows.length > 0) {
      const rr = roleRows[0] as unknown as { key: number; name: string };
      roleName = rr.name;
      const colorRows = await db.execute(sql`
        SELECT color FROM ${sql.raw(`"${S}".entity_color`)}
        WHERE entity_type = 'role' AND entity_key = ${rr.key} LIMIT 1
      `);
      if (colorRows.length > 0) roleColor = (colorRows[0] as unknown as { color: string }).color;
    }
  } catch { /* fallback to code */ }
  return c.json({ data: { ...mapUser(row), role: roleCode, role_name: roleName, role_color: roleColor } }, 200);
});

app.openapi(routes.get, async (c) => {
  const filter = { key: Number(c.req.param("userId")) };
  const row = await getCurrent<CurrentUser>("current_user", filter);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: mapUser(row) }, 200);
});

app.use(routes.create.getRoutingPath(), requireRole("platform", "admin"));
app.openapi(routes.create, async (c) => {
  const body = c.req.valid("json") as Record<string, unknown>;
  const email = body.email as string;
  const code = body.code as string;
  const name = body.name as string;

  const existing = await getCurrent<CurrentUser>("current_user", { email });
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const hashes = computeMasterHashes({ email, role_key: String(body.role_id), code, name }, null);
  const [created] = await db.insert(user).values({
    email,
    role_key: body.role_id as number, code, name,
    type: (body.type as string) ?? null,
    ...hashes,
  }).returning();
  logAudit(c, {
    action: "create", entityType: "user", entityKey: created.key,
    entityName: name,
    summary: `ユーザー「${name}」を作成しました`,
  });
  return c.json({ data: mapUser(created as unknown as CurrentUser) }, 201);
});

app.use(routes.update.getRoutingPath(), requireRole("platform", "admin"));
app.openapi(routes.update, async (c) => {
  const userKey = Number(c.req.param("userId"));
  const body = c.req.valid("json") as Record<string, unknown>;

  if (userKey === c.get("userKey") && body.role_id !== undefined) {
    return c.json({ error: "Cannot change own role" }, 403);
  }

  const current = await getCurrent<CurrentUser>("current_user", { key: userKey });
  if (!current) return c.json({ error: "Not found" }, 404);
  const maxRev = await getMaxRevision("user", userKey);
  const newRoleKey = (body.role_id as number | undefined) ?? current.role_key;
  const newCode = (body.code as string | undefined) ?? current.code;
  const newName = (body.name as string | undefined) ?? current.name;
  const newType = body.type !== undefined ? (body.type as string | null) : current.type;
  const hashes = computeMasterHashes({ email: current.email, role_key: String(newRoleKey), code: newCode, name: newName }, current.revision_hash);
  const [updated] = await db.insert(user).values({
    key: userKey, revision: maxRev + 1,
    email: current.email, external_id: current.external_id,
    role_key: newRoleKey, code: newCode, name: newName,
    type: newType,
    is_active: current.is_active, ...hashes,
  }).returning();
  logAudit(c, {
    action: "update", entityType: "user", entityKey: userKey,
    entityName: newName, revision: maxRev + 1,
    summary: `ユーザー「${newName}」を更新しました`,
  });
  return c.json({ data: mapUser(updated as unknown as CurrentUser) }, 200);
});

app.use(routes.del.getRoutingPath(), requireRole("platform", "admin"));
app.openapi(routes.del, async (c) => {
  const userKey = Number(c.req.param("userId"));
  if (userKey === c.get("userKey")) {
    return c.json({ error: "Cannot deactivate yourself" }, 422);
  }

  const current = await getCurrent<CurrentUser>("current_user", { key: userKey });
  if (!current) return c.json({ error: "Not found" }, 404);
  if (current.is_active === false) return c.json({ error: "Already deactivated" }, 422);

  const maxRev = await getMaxRevision("user", userKey);
  const hashes = computeMasterHashes(
    { email: current.email, role_key: String(current.role_key), code: current.code, name: current.name },
    current.revision_hash,
  );
  await db.insert(user).values({
    key: userKey, revision: maxRev + 1,
    email: current.email, external_id: current.external_id,
    role_key: current.role_key, code: current.code, name: current.name,
    type: current.type,
    is_active: false, ...hashes,
  });
  logAudit(c, {
    action: "deactivate", entityType: "user", entityKey: userKey,
    entityName: current.name, revision: maxRev + 1,
    summary: `ユーザー「${current.name}」を無効化しました`,
  });
  return c.json({ message: "Deactivated" }, 200);
});

app.openapi(routes.history, async (c) => {
  const rows = await listHistory<CurrentUser>("history_user", Number(c.req.param("userId")));
  return c.json({ data: rows.map(mapUser) } as never, 200);
});

// ============================================================
// API Key management (own keys only)
// ============================================================

app.get("/me/api-keys", async (c) => {
  const userKey = c.get("userKey");
  if (!userKey) return c.json({ error: "Authentication required" }, 401);
  const keys = await listApiKeys(userKey);
  return c.json({ data: keys }, 200);
});

app.post("/me/api-keys", async (c) => {
  const userKey = c.get("userKey");
  const role = c.get("userRole");
  if (!userKey) return c.json({ error: "Authentication required" }, 401);

  const body = await c.req.json<{ name: string; expires_in_days?: number }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const expiresAt = body.expires_in_days
    ? new Date(Date.now() + body.expires_in_days * 86400_000)
    : null;

  const { rawKey, record } = await createApiKey({
    userKey, role, name: body.name.trim(), expiresAt,
  });

  logAudit(c, {
    action: "create", entityType: "api_key", entityKey: 0,
    entityName: record.name,
    summary: `APIキー「${record.name}」を作成しました`,
  });
  return c.json({ data: { ...record, raw_key: rawKey } }, 201);
});

app.delete("/me/api-keys/:keyId", async (c) => {
  const userKey = c.get("userKey");
  if (!userKey) return c.json({ error: "Authentication required" }, 401);

  const keyId = c.req.param("keyId");
  const deleted = await revokeApiKey(keyId, userKey);
  if (!deleted) return c.json({ error: "Not found" }, 404);

  logAudit(c, {
    action: "delete", entityType: "api_key", entityKey: 0,
    summary: `APIキーを削除しました`,
  });
  return c.json({ message: "API key revoked" }, 200);
});

export default app;
