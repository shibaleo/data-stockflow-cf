import { createApp } from "../lib/create-app.js";
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "../lib/db/index.js";
import { sql } from "drizzle-orm";
import { voucher, journal, journalLine } from "../lib/db/schema.js";
import {
  errorSchema, dataSchema, paginatedSchema, listQuerySchema,
  voucherResponseSchema, voucherDetailResponseSchema,
  createVoucherSchema, updateVoucherSchema,
} from "../lib/validators.js";
import { requireAuth, requireRole } from "../middleware/guards.js";
import { recordAuditLog } from "../lib/audit-log.js";
import { createMapper } from "../lib/crud-factory.js";
import { authorityCheck } from "../lib/authority.js";
import {
  acquireNextHeaderSequence,
  computeHeaderHash,
  computeRevisionHash,
  computeVoucherContentHash,
  computeLinesHash,
  GENESIS_PREV_HASH,
  type LineHashInput,
} from "../lib/hash-chain.js";
import { bumpVoucherRevision } from "../lib/voucher-cascade.js";
import { decodeCursor, encodeCursor } from "../lib/append-only.js";

const S = "data_stockflow";

type VoucherRow = {
  key: number; revision: number;
  idempotency_key: string; voucher_code: string | null;
  description: string | null; source_system: string | null;
  type: string | null; sequence_no: number;
  prev_header_hash: string; header_hash: string;
  lines_hash: string; prev_revision_hash: string; revision_hash: string;
  authority_role_key: number; is_active: boolean;
  created_at: Date | string; created_by: number;
};

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

const mapVoucher = createMapper<VoucherRow>(
  ["sequence_no", "prev_header_hash", "header_hash"],
  [],
);

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

// ── Route definitions ──

const list = createRoute({
  method: "get", path: "/", tags: ["Vouchers"], summary: "List vouchers",
  request: { query: listQuerySchema },
  responses: { 200: { description: "Success", content: { "application/json": {
    schema: paginatedSchema(voucherResponseSchema),
  } } } },
});

const get = createRoute({
  method: "get", path: "/{voucherId}", tags: ["Vouchers"], summary: "Get voucher with journals",
  request: { params: z.object({ voucherId: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: dataSchema(voucherDetailResponseSchema) } } },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

const create = createRoute({
  method: "post", path: "/", tags: ["Vouchers"], summary: "Create voucher with journals",
  request: { body: { content: { "application/json": { schema: createVoucherSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: dataSchema(voucherDetailResponseSchema) } } },
    422: { description: "Validation error", content: { "application/json": { schema: errorSchema } } },
  },
});

const update = createRoute({
  method: "put", path: "/{voucherId}", tags: ["Vouchers"], summary: "Update voucher (new revision)",
  request: {
    params: z.object({ voucherId: z.string() }),
    body: { content: { "application/json": { schema: updateVoucherSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: dataSchema(voucherDetailResponseSchema) } } },
    403: { description: "Forbidden", content: { "application/json": { schema: errorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

// ── Helpers ──

function buildJournalResponse(j: CurrentJournal, lines: JournalLineRow[]) {
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
    lines: lines.map((l) => ({
      uuid: l.uuid,
      sort_order: l.sort_order,
      side: l.side,
      account_id: l.account_key,
      counterparty_id: l.counterparty_key,
      amount: String(Math.abs(parseFloat(String(l.amount)))),
      description: l.description,
    })),
  };
}

async function loadJournalsWithLines(voucherKey: number) {
  const jRows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".current_journal`)}
    WHERE voucher_key = ${voucherKey}
    ORDER BY key
  `);
  const journals = jRows as unknown as CurrentJournal[];
  return Promise.all(journals.map(async (j) => {
    const lineRows = await db.execute(sql`
      SELECT * FROM ${sql.raw(`"${S}".journal_line`)}
      WHERE journal_key = ${j.key} AND journal_revision = ${j.revision}
      ORDER BY sort_order, side
    `);
    return buildJournalResponse(j, lineRows as unknown as JournalLineRow[]);
  }));
}

// ── Handlers ──

app.openapi(list, async (c) => {
  const query = c.req.valid("query");
  const limit = Math.min(Number(query.limit || 100), 200);
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
  const cursorClause = cursor ? sql`AND key < ${cursor}` : sql``;
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".current_voucher`)}
    WHERE is_active = true
    ${cursorClause}
    ORDER BY key DESC
    LIMIT ${limit}
  `);
  const typedRows = rows as unknown as VoucherRow[];
  const mapped = typedRows.map(mapVoucher);
  const nextCursor = typedRows.length === limit
    ? encodeCursor(typedRows[typedRows.length - 1])
    : null;
  return c.json({ data: mapped, next_cursor: nextCursor } as never, 200);
});

app.openapi(get, async (c) => {
  const voucherKey = Number(c.req.param("voucherId"));

  const vRows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".current_voucher`)}
    WHERE key = ${voucherKey}
    LIMIT 1
  `);
  if (vRows.length === 0) return c.json({ error: "Not found" }, 404);
  const v = vRows[0] as unknown as VoucherRow;

  const journalsWithDetails = await loadJournalsWithLines(voucherKey);
  return c.json({ data: { ...mapVoucher(v), journals: journalsWithDetails } } as never, 200);
});

app.use(create.getRoutingPath(), requireRole("admin", "user"));
app.openapi(create, async (c) => {
  const userKey = c.get("userKey");
  const body = c.req.valid("json");

  // Validate balance for each journal
  for (const jInput of body.journals) {
    const debit = jInput.lines.filter((l) => l.side === "debit").reduce((s, l) => s + l.amount, 0);
    const credit = jInput.lines.filter((l) => l.side === "credit").reduce((s, l) => s + l.amount, 0);
    if (debit !== credit) {
      return c.json({ error: `Lines do not balance: debit(${debit}) != credit(${credit})` }, 422);
    }
  }

  const result = await db.transaction(async (tx) => {
    const { nextSequenceNo, prevHeaderHash } = await acquireNextHeaderSequence(tx);
    const headerCreatedAt = new Date().toISOString();
    const headerHash = computeHeaderHash({
      prev_header_hash: prevHeaderHash,
      sequence_no: nextSequenceNo, idempotency_key: body.idempotency_key,
      created_at: headerCreatedAt,
    });

    const journalHashSpecs = body.journals.map((jInput) => {
      const signedLines = jInput.lines.map((l) => ({
        ...l,
        amount: String(l.side === "debit" ? -l.amount : l.amount),
      }));
      const linesHashInputs: LineHashInput[] = signedLines.map((l) => ({
        sort_order: l.sort_order, side: l.side, account_key: l.account_id,
        counterparty_key: l.counterparty_id ?? null,
        amount: l.amount, description: l.description,
      }));
      const linesHash = computeLinesHash(linesHashInputs);
      const revisionHash = computeRevisionHash({
        prev_revision_hash: GENESIS_PREV_HASH, journal_key: 0, revision: 1,
        adjustment_flag: jInput.adjustment_flag ?? "none",
        description: jInput.description ?? null, lines_hash: linesHash,
      });
      return { signedLines, linesHash, revisionHash };
    });

    const voucherLinesHash = computeVoucherContentHash(
      journalHashSpecs.map((s) => s.revisionHash),
    );
    const voucherRevisionHash = computeRevisionHash({
      prev_revision_hash: GENESIS_PREV_HASH, journal_key: 0,
      revision: 1, adjustment_flag: "none",
      description: body.description ?? null,
      lines_hash: voucherLinesHash,
    });

    const [v] = await tx.insert(voucher).values({
      idempotency_key: body.idempotency_key,
      voucher_code: body.voucher_code ?? null,
      description: body.description ?? null, source_system: body.source_system ?? null,
      type: body.type ?? null,
      created_by: userKey, sequence_no: nextSequenceNo,
      prev_header_hash: prevHeaderHash, header_hash: headerHash,
      lines_hash: voucherLinesHash, prev_revision_hash: GENESIS_PREV_HASH,
      revision_hash: voucherRevisionHash,
      authority_role_key: c.get("roleKey"),
    }).returning();

    const createdJournals = [];
    for (let i = 0; i < body.journals.length; i++) {
      const jInput = body.journals[i];
      const { signedLines, linesHash, revisionHash } = journalHashSpecs[i];

      const [j] = await tx.insert(journal).values({
        voucher_key: v.key, book_key: jInput.book_id,
        posted_at: new Date(jInput.posted_at),
        type: jInput.type ?? null,
        tags: jInput.tags ?? [],
        adjustment_flag: jInput.adjustment_flag ?? "none",
        description: jInput.description ?? null,
        metadata: jInput.metadata ?? {},
        created_by: userKey, lines_hash: linesHash,
        prev_revision_hash: GENESIS_PREV_HASH, revision_hash: revisionHash,
        authority_role_key: c.get("roleKey"),
      }).returning();

      await tx.insert(journalLine).values(
        signedLines.map((l) => ({
          journal_key: j.key, journal_revision: 1,
          sort_order: l.sort_order, side: l.side,
          account_key: l.account_id,
          counterparty_key: l.counterparty_id ?? null,
          amount: l.amount, description: l.description ?? null,
        })),
      );

      createdJournals.push({ journal: j, lines: signedLines });
    }

    return { voucher: v, journals: createdJournals };
  });

  logAudit(c, {
    action: "create", entityType: "voucher", entityKey: result.voucher.key,
    entityName: body.voucher_code ?? undefined,
    summary: `伝票を作成しました（仕訳${body.journals.length}件）`,
  });

  const voucherResponse = mapVoucher(result.voucher as unknown as VoucherRow);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const journalsResponse = result.journals.map((j: any) => ({
    id: j.journal.key, voucher_id: result.voucher.key, book_id: j.journal.book_key,
    posted_at: j.journal.posted_at instanceof Date ? j.journal.posted_at.toISOString() : String(j.journal.posted_at),
    revision: 1,
    is_active: true,
    type: j.journal.type,
    tags: j.journal.tags ?? [],
    authority_role_key: j.journal.authority_role_key,
    adjustment_flag: j.journal.adjustment_flag, description: j.journal.description,
    metadata: (j.journal.metadata ?? {}) as Record<string, unknown>,
    created_at: j.journal.created_at instanceof Date ? j.journal.created_at.toISOString() : String(j.journal.created_at),
    lines: j.lines.map((l: any) => ({
      uuid: "", sort_order: l.sort_order, side: l.side,
      account_id: l.account_id,
      counterparty_id: l.counterparty_id ?? null,
      amount: String(Math.abs(parseFloat(l.amount))),
      description: l.description ?? null,
    })),
  }));

  return c.json({ data: { ...voucherResponse, journals: journalsResponse } } as never, 201);
});

// ── Update handler ──

app.use(update.getRoutingPath(), requireRole("admin", "user"));
app.openapi(update, async (c) => {
  const userKey = c.get("userKey");
  const voucherKey = Number(c.req.param("voucherId"));
  const body = c.req.valid("json");

  const checkRows = await db.execute(sql`
    SELECT key, authority_role_key FROM ${sql.raw(`"${S}".current_voucher`)}
    WHERE key = ${voucherKey}
    LIMIT 1
  `);
  if (checkRows.length === 0) return c.json({ error: "Not found" }, 404);
  const vRow = checkRows[0] as unknown as { key: number; authority_role_key: number };
  const authErr = await authorityCheck(c.get("roleKey"), vRow.authority_role_key, "voucher");
  if (authErr) return c.json({ error: authErr }, 403);

  const result = await db.transaction(async (tx) => {
    return bumpVoucherRevision(tx, voucherKey, userKey, {
      voucher_code: body.voucher_code,
      description: body.description,
      source_system: body.source_system,
    });
  });

  logAudit(c, {
    action: "update", entityType: "voucher", entityKey: voucherKey,
    entityName: result.voucher_code ?? undefined, revision: result.revision,
    summary: `伝票 #${voucherKey} を更新しました`,
  });

  const journalsWithDetails = await loadJournalsWithLines(voucherKey);
  return c.json({ data: { ...mapVoucher(result as unknown as VoucherRow), journals: journalsWithDetails } } as never, 200);
});

export default app;
