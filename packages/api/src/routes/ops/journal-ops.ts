/**
 * Journal Operations — reversal
 * v4: removed entity_category, department_key.
 *
 * POST /journals/:journalId/reverse
 *   Creates a new journal with all debit/credit sides flipped
 *   under the same voucher as the original.
 */
import { createApp } from "../../lib/create-app.js";
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "../../lib/db/index.js";
import { sql } from "drizzle-orm";
import { journal, journalLine } from "../../lib/db/schema.js";
import { getCurrent } from "../../lib/append-only.js";
import {
  errorSchema,
  dataSchema,
  journalDetailResponseSchema,
} from "../../lib/validators.js";
import { requireAuth, requireRole } from "../../middleware/guards.js";
import { recordAuditLog } from "../../lib/audit-log.js";
import { authorityCheck } from "../../lib/authority.js";
import { bumpVoucherRevision } from "../../lib/voucher-cascade.js";
import {
  computeRevisionHash,
  computeLinesHash,
  GENESIS_PREV_HASH,
  type LineHashInput,
} from "../../lib/hash-chain.js";

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

// ── Schema ──

const reverseSchema = z.object({
  description: z.string().optional(),
});

// ── Route ──

const reverse = createRoute({
  method: "post",
  path: "/{journalId}/reverse",
  tags: ["Journal Operations"],
  summary: "Reverse a journal entry (full-amount counter-entry)",
  request: {
    params: z.object({ journalId: z.string() }),
    body: { content: { "application/json": { schema: reverseSchema } } },
  },
  responses: {
    201: {
      description: "Reversal created",
      content: { "application/json": { schema: dataSchema(journalDetailResponseSchema) } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: errorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

// ── Handler ──

app.use(reverse.getRoutingPath(), requireRole("admin", "user"));
app.openapi(reverse, async (c) => {
  const userKey = c.get("userKey");
  const journalKey = Number(c.req.param("journalId"));
  const body = c.req.valid("json");

  const current = await getCurrent<CurrentJournal>("current_journal", {
    key: journalKey,
  });
  if (!current) return c.json({ error: "Journal not found" }, 404);
  const authErr = await authorityCheck(c.get("roleKey"), current.authority_role_key, "journal");
  if (authErr) return c.json({ error: authErr }, 403);
  if (!current.is_active)
    return c.json({ error: "Cannot reverse an inactive journal" }, 422);

  // Get original lines
  const linesRaw = await db.execute(
    sql`SELECT * FROM ${sql.raw(`"${S}".journal_line`)}
    WHERE journal_key = ${journalKey} AND journal_revision = ${current.revision}
    ORDER BY sort_order, side`
  );
  const lines = linesRaw as unknown as JournalLineRow[];
  if (lines.length === 0)
    return c.json({ error: "Original journal has no lines" }, 422);

  const description =
    body.description ?? `Reversal of journal ${journalKey}`;

  const result = await db.transaction(async (tx) => {
    const reversedLineInputs: LineHashInput[] = lines.map((l) => ({
      sort_order: l.sort_order,
      side: l.side === "debit" ? "credit" : "debit",
      account_key: l.account_key,
      counterparty_key: l.counterparty_key,
      amount: String(-parseFloat(String(l.amount))),
      description: l.description,
    }));
    const linesHash = computeLinesHash(reversedLineInputs);
    const revisionHash = computeRevisionHash({
      prev_revision_hash: GENESIS_PREV_HASH,
      journal_key: 0,
      revision: 1,
      adjustment_flag: current.adjustment_flag,
      description: description ?? null,
      lines_hash: linesHash,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [j] = await tx.insert(journal).values({
      voucher_key: current.voucher_key,
      book_key: current.book_key,
      posted_at: current.posted_at instanceof Date ? current.posted_at : new Date(current.posted_at),
      type: current.type,
      tags: current.tags ?? [],
      adjustment_flag: current.adjustment_flag,
      description,
      metadata: current.metadata ?? {},
      created_by: userKey,
      lines_hash: linesHash,
      prev_revision_hash: GENESIS_PREV_HASH,
      revision_hash: revisionHash,
      authority_role_key: current.authority_role_key,
    } as any).returning();

    await tx.insert(journalLine).values(
      lines.map((l) => ({
        journal_key: j.key,
        journal_revision: 1,
        sort_order: l.sort_order,
        side: l.side === "debit" ? "credit" : "debit",
        account_key: l.account_key,
        counterparty_key: l.counterparty_key,
        amount: String(-parseFloat(String(l.amount))),
        description: l.description,
      })),
    );

    await bumpVoucherRevision(tx, current.voucher_key, userKey);

    return j;
  });

  recordAuditLog({
    userKey: c.get("userKey"),
    userName: c.get("userName"),
    userRole: c.get("userRole"),
    action: "reverse",
    entityType: "journal",
    entityKey: result.key,
    entityName: description,
    revision: 1,
    summary: `仕訳 #${journalKey} の逆仕訳を作成しました`,
    changes: { original_journal_key: journalKey },
    sourceIp: c.req.header("x-forwarded-for") ?? null,
  }).catch(console.error);

  // Build response
  const responseLineRows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}".journal_line`)}
    WHERE journal_key = ${result.key} AND journal_revision = 1
    ORDER BY sort_order, side
  `);

  const responseLines = (responseLineRows as unknown as JournalLineRow[]).map((l) => ({
    uuid: l.uuid,
    sort_order: l.sort_order,
    side: l.side,
    account_id: l.account_key,
    counterparty_id: l.counterparty_key,
    amount: String(Math.abs(parseFloat(String(l.amount)))),
    description: l.description,
  }));

  return c.json({
    data: {
      id: result.key, voucher_id: result.voucher_key, book_id: result.book_key,
      posted_at: result.posted_at instanceof Date ? result.posted_at.toISOString() : String(result.posted_at),
      revision: 1,
      is_active: true,
      type: result.type,
      tags: result.tags ?? [],
      authority_role_key: result.authority_role_key,
      adjustment_flag: result.adjustment_flag,
      description: result.description,
      metadata: (result.metadata ?? {}) as Record<string, unknown>,
      created_at: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
      lines: responseLines,
    },
  } as never, 201);
});

export default app;
