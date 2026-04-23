/**
 * Journal routes — nested under /vouchers/:voucherId/journals
 *
 * GET    /                    List journals for voucher
 * GET    /:journalId          Get journal with lines
 * PUT    /:journalId          Update journal (new revision)
 * DELETE /:journalId          Deactivate journal
 * GET    /:journalId/history  Journal revision history
 */
import { createApp } from "../lib/create-app.js";
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "../lib/db/index.js";
import { sql } from "drizzle-orm";
import { journal, journalLine } from "../lib/db/schema.js";
import {
  errorSchema, messageSchema, dataSchema,
  journalResponseSchema, journalDetailResponseSchema,
  updateJournalSchema,
} from "../lib/validators.js";
import { requireAuth, requireRole } from "../middleware/guards.js";
import { recordAuditLog } from "../lib/audit-log.js";
import { bumpVoucherRevision } from "../lib/voucher-cascade.js";
import { authorityCheck } from "../lib/authority.js";
import { getMaxRevision } from "../lib/append-only.js";
import {
  computeRevisionHash,
  computeLinesHash,
  getPrevRevisionHash,
  GENESIS_PREV_HASH,
  type LineHashInput,
} from "../lib/hash-chain.js";

const S = "data_stockflow";

type CurrentJournal = {
  key: number; revision: number;
  voucher_key: number; book_key: number; posted_at: Date | string;
  type: string | null; tags: string[];
  adjustment_flag: string; description: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean; authority_role_key: number;
  lines_hash: string; prev_revision_hash: string; revision_hash: string;
  created_at: Date | string; created_by: number;
};

type JournalLineRow = {
  uuid: string; journal_key: number; journal_revision: number;
  sort_order: number; side: string;
  account_key: number; counterparty_key: number | null;
  amount: string | number; description: string | null;
};

const app = createApp();
app.use("*", requireAuth());

function logAudit(c: { get: (k: string) => unknown; req: { header: (k: string) => string | undefined } }, opts: {
  action: string; entityType: string; entityKey: number; entityName?: string;
  revision?: number; summary: string;
}) {
  recordAuditLog({
    userKey: c.get("userKey") as number,
    userName: c.get("userName") as string,
    userRole: c.get("userRole") as string,
    action: opts.action, entityType: opts.entityType,
    entityKey: opts.entityKey, entityName: opts.entityName,
    revision: opts.revision, summary: opts.summary,
    sourceIp: c.req.header("x-forwarded-for") ?? null,
  }).catch(console.error);
}

// ── Helpers ──

async function getJournalForVoucher(
  voucherKey: number,
  journalKey: number,
): Promise<CurrentJournal | null> {
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".current_journal`)}
    WHERE voucher_key = ${voucherKey} AND key = ${journalKey}
    LIMIT 1
  `);
  return (rows[0] as unknown as CurrentJournal) ?? null;
}

async function buildJournalDetail(j: CurrentJournal) {
  const lineRows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".journal_line`)}
    WHERE journal_key = ${j.key} AND journal_revision = ${j.revision}
    ORDER BY sort_order, side
  `);
  const lines = (lineRows as unknown as JournalLineRow[]).map((l) => ({
    uuid: l.uuid,
    sort_order: l.sort_order,
    side: l.side,
    account_id: l.account_key,
    counterparty_id: l.counterparty_key,
    amount: String(Math.abs(parseFloat(String(l.amount)))),
    description: l.description,
  }));
  return {
    id: j.key, voucher_id: j.voucher_key, book_id: j.book_key,
    posted_at: j.posted_at instanceof Date ? j.posted_at.toISOString() : String(j.posted_at),
    revision: j.revision,
    is_active: j.is_active,
    type: j.type,
    tags: j.tags ?? [],
    authority_role_key: j.authority_role_key,
    adjustment_flag: j.adjustment_flag,
    description: j.description,
    metadata: (j.metadata ?? {}) as Record<string, unknown>,
    created_at: j.created_at instanceof Date ? j.created_at.toISOString() : String(j.created_at),
    lines,
  };
}

// ── Route definitions ──

const params = z.object({
  voucherId: z.string(),
  journalId: z.string(),
});

const listRoute = createRoute({
  method: "get", path: "/", tags: ["Journals"], summary: "List journals for voucher",
  request: { params: z.object({ voucherId: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": {
      schema: z.object({ data: z.array(journalDetailResponseSchema) }),
    } } },
  },
});

const getRoute = createRoute({
  method: "get", path: "/{journalId}", tags: ["Journals"], summary: "Get journal detail",
  request: { params },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: dataSchema(journalDetailResponseSchema) } } },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

const updateRoute = createRoute({
  method: "put", path: "/{journalId}", tags: ["Journals"], summary: "Update journal (new revision)",
  request: { params, body: { content: { "application/json": { schema: updateJournalSchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: dataSchema(journalDetailResponseSchema) } } },
    403: { description: "Forbidden", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
    422: { description: "Validation error", content: { "application/json": { schema: errorSchema } } },
  },
});

const deleteRoute = createRoute({
  method: "delete", path: "/{journalId}", tags: ["Journals"], summary: "Deactivate journal",
  request: { params },
  responses: {
    200: { description: "Deactivated", content: { "application/json": { schema: messageSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
    422: { description: "Already deactivated", content: { "application/json": { schema: errorSchema } } },
  },
});

const historyRoute = createRoute({
  method: "get", path: "/{journalId}/history", tags: ["Journals"], summary: "Journal revision history",
  request: { params },
  responses: {
    200: { description: "Success", content: { "application/json": {
      schema: z.object({ data: z.array(journalResponseSchema) }),
    } } },
  },
});

// ── Handlers ──

app.openapi(listRoute, async (c) => {
  const voucherKey = Number(c.req.param("voucherId"));
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".current_journal`)}
    WHERE voucher_key = ${voucherKey}
    ORDER BY key
  `);
  const journals = rows as unknown as CurrentJournal[];
  const data = await Promise.all(journals.map(buildJournalDetail));
  return c.json({ data } as never, 200);
});

app.openapi(getRoute, async (c) => {
  const voucherKey = Number(c.req.param("voucherId"));
  const journalKey = Number(c.req.param("journalId"));
  const j = await getJournalForVoucher(voucherKey, journalKey);
  if (!j) return c.json({ error: "Not found" }, 404);
  return c.json({ data: await buildJournalDetail(j) } as never, 200);
});

app.use(updateRoute.getRoutingPath(), requireRole("admin", "user"));
app.openapi(updateRoute, async (c) => {
  const userKey = c.get("userKey");
  const voucherKey = Number(c.req.param("voucherId"));
  const journalKey = Number(c.req.param("journalId"));
  const body = c.req.valid("json");

  const current = await getJournalForVoucher(voucherKey, journalKey);
  if (!current) return c.json({ error: "Not found" }, 404);
  const authErr = await authorityCheck(c.get("roleKey"), current.authority_role_key, "journal");
  if (authErr) return c.json({ error: authErr }, 403);

  // Balance check
  const debit = body.lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
  const credit = body.lines.filter((l) => l.side === "credit").reduce((s, l) => s + l.amount, 0);
  if (debit !== credit) {
    return c.json({ error: `Lines do not balance: debit(${debit}) != credit(${credit})` }, 422);
  }

  const signedLines = body.lines.map((l) => ({
    ...l,
    amount: String(l.side === "debit" ? -l.amount : l.amount),
  }));

  const maxRev = await getMaxRevision("journal", journalKey);

  const result = await db.transaction(async (tx) => {
    const prevRevisionHash = await getPrevRevisionHash(tx, journalKey, maxRev + 1);

    const resolvedAdj = body.adjustment_flag ?? current.adjustment_flag;
    const resolvedDesc = body.description !== undefined ? body.description : current.description;
    const resolvedMetadata = body.metadata ?? current.metadata;
    const resolvedActive = body.is_active ?? current.is_active;
    const resolvedBookKey = body.book_id ?? current.book_key;
    const resolvedPostedAt = body.posted_at ? new Date(body.posted_at) : current.posted_at;
    const resolvedType = body.type !== undefined ? body.type : current.type;
    const resolvedTags = body.tags ?? current.tags;

    const linesHashInputs: LineHashInput[] = signedLines.map((l) => ({
      sort_order: l.sort_order, side: l.side, account_key: l.account_id,
      counterparty_key: l.counterparty_id ?? null,
      amount: l.amount, description: l.description,
    }));
    const linesHash = computeLinesHash(linesHashInputs);
    const revisionHash = computeRevisionHash({
      prev_revision_hash: prevRevisionHash, journal_key: journalKey,
      revision: maxRev + 1, adjustment_flag: resolvedAdj,
      description: resolvedDesc ?? null, lines_hash: linesHash,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [j] = await tx.insert(journal).values({
      key: journalKey, revision: maxRev + 1,
      voucher_key: voucherKey, book_key: resolvedBookKey,
      posted_at: resolvedPostedAt,
      is_active: resolvedActive,
      type: resolvedType,
      tags: resolvedTags,
      adjustment_flag: resolvedAdj,
      description: resolvedDesc, metadata: resolvedMetadata,
      created_by: userKey,
      lines_hash: linesHash, prev_revision_hash: prevRevisionHash,
      revision_hash: revisionHash,
      authority_role_key: current.authority_role_key,
    } as any).returning();

    await tx.insert(journalLine).values(
      signedLines.map((l) => ({
        journal_key: journalKey, journal_revision: maxRev + 1,
        sort_order: l.sort_order, side: l.side,
        account_key: l.account_id,
        counterparty_key: l.counterparty_id ?? null,
        amount: l.amount, description: l.description ?? null,
      })),
    );

    await bumpVoucherRevision(tx, voucherKey, userKey);

    return j;
  });

  const action = body.is_active === false ? "deactivate" as const : "update" as const;
  logAudit(c, {
    action, entityType: "journal", entityKey: journalKey,
    entityName: current.description ?? undefined,
    revision: maxRev + 1,
    summary: action === "deactivate"
      ? `仕訳 #${journalKey} を無効化しました`
      : `仕訳 #${journalKey} を更新しました`,
  });

  const updated = await getJournalForVoucher(voucherKey, journalKey);
  return c.json({ data: await buildJournalDetail(updated!) } as never, 200);
});

app.use(deleteRoute.getRoutingPath(), requireRole("admin", "user"));
app.openapi(deleteRoute, async (c) => {
  const userKey = c.get("userKey");
  const voucherKey = Number(c.req.param("voucherId"));
  const journalKey = Number(c.req.param("journalId"));

  const current = await getJournalForVoucher(voucherKey, journalKey);
  if (!current) return c.json({ error: "Not found" }, 404);
  const authErr = await authorityCheck(c.get("roleKey"), current.authority_role_key, "journal");
  if (authErr) return c.json({ error: authErr }, 403);
  if (!current.is_active) return c.json({ error: "Already deactivated" }, 422);

  const maxRev = await getMaxRevision("journal", journalKey);

  await db.transaction(async (tx) => {
    const prevRevisionHash = await getPrevRevisionHash(tx, journalKey, maxRev + 1);
    const linesHash = computeLinesHash([]);
    const revisionHash = computeRevisionHash({
      prev_revision_hash: prevRevisionHash, journal_key: journalKey,
      revision: maxRev + 1, adjustment_flag: current.adjustment_flag,
      description: current.description ?? null, lines_hash: linesHash,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.insert(journal).values({
      key: journalKey, revision: maxRev + 1,
      voucher_key: voucherKey, book_key: current.book_key,
      posted_at: current.posted_at,
      is_active: false,
      type: current.type,
      tags: current.tags,
      adjustment_flag: current.adjustment_flag,
      description: current.description, metadata: current.metadata,
      created_by: userKey,
      lines_hash: linesHash, prev_revision_hash: prevRevisionHash,
      revision_hash: revisionHash,
      authority_role_key: current.authority_role_key,
    } as any);

    await bumpVoucherRevision(tx, voucherKey, userKey);
  });

  logAudit(c, {
    action: "deactivate", entityType: "journal", entityKey: journalKey,
    entityName: current.description ?? undefined,
    revision: maxRev + 1,
    summary: `仕訳 #${journalKey} を無効化しました`,
  });
  return c.json({ message: "Deactivated" }, 200);
});

app.openapi(historyRoute, async (c) => {
  const journalKey = Number(c.req.param("journalId"));
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".journal`)}
    WHERE key = ${journalKey}
    ORDER BY revision ASC
  `);
  const journals = rows as unknown as CurrentJournal[];
  return c.json({
    data: journals.map((j) => ({
      id: j.key, voucher_id: j.voucher_key, book_id: j.book_key,
      posted_at: j.posted_at instanceof Date ? j.posted_at.toISOString() : String(j.posted_at),
      revision: j.revision,
      is_active: j.is_active,
      type: j.type,
      tags: j.tags ?? [],
      authority_role_key: j.authority_role_key,
      adjustment_flag: j.adjustment_flag,
      description: j.description,
      metadata: (j.metadata ?? {}) as Record<string, unknown>,
      created_at: j.created_at instanceof Date ? j.created_at.toISOString() : String(j.created_at),
    })),
  } as never, 200);
});

export default app;
