import {
  pgSchema,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  bigint,
  uniqueIndex,
  index,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const s = pgSchema("data_stockflow");

// ============================================================
// SEQUENCES (8 — v1 の 12 から削減)
// ============================================================

export const tenantKeySeq = s.sequence("tenant_key_seq", {
  startWith: 100000000000,
});
export const roleKeySeq = s.sequence("role_key_seq", {
  startWith: 100000000000,
});
export const userKeySeq = s.sequence("user_key_seq", {
  startWith: 100000000000,
});
export const bookKeySeq = s.sequence("book_key_seq", {
  startWith: 100000000000,
});
export const accountKeySeq = s.sequence("account_key_seq", {
  startWith: 100000000000,
});
export const counterpartyKeySeq = s.sequence("counterparty_key_seq", {
  startWith: 100000000000,
});
export const voucherKeySeq = s.sequence("voucher_key_seq", {
  startWith: 100000000000,
});
export const journalKeySeq = s.sequence("journal_key_seq", {
  startWith: 100000000000,
});

// ============================================================
// 基盤系 (tenant, role, user)
// ============================================================

export const tenant = s.table(
  "tenant",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.tenant_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    name: text("name").notNull(),
    locked_until: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.key, t.revision] })]
);

export const role = s.table(
  "role",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.role_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("role_code_revision_key").on(t.code, t.revision),
  ]
);

export const user = s.table(
  "user",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.user_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    role_key: bigint("role_key", { mode: "number" }).notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    external_id: text("external_id"),
    type: text("type"),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("user_tenant_key_code_revision_key").on(
      t.tenant_key,
      t.code,
      t.revision
    ),
  ]
);

// ============================================================
// マスタ系 (book, account, counterparty)
// ============================================================

export const book = s.table(
  "book",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.book_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    created_by: bigint("created_by", { mode: "number" }).notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    unit_symbol: text("unit_symbol").default("").notNull(),
    unit_position: text("unit_position").default("left").notNull(),
    type: text("type"),
    type_labels: jsonb("type_labels")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    authority_role_key: bigint("authority_role_key", {
      mode: "number",
    }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("book_tenant_key_code_revision_key").on(
      t.tenant_key,
      t.code,
      t.revision
    ),
  ]
);

export const account = s.table(
  "account",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.account_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    created_by: bigint("created_by", { mode: "number" }).notNull(),
    book_key: bigint("book_key", { mode: "number" }).notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    account_type: text("account_type").notNull(),
    classification: text("classification"),
    parent_account_key: bigint("parent_account_key", { mode: "number" }),
    sort_order: integer("sort_order").default(0).notNull(),
    authority_role_key: bigint("authority_role_key", {
      mode: "number",
    }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("account_book_key_code_revision_key").on(
      t.book_key,
      t.code,
      t.revision
    ),
  ]
);

export const counterparty = s.table(
  "counterparty",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.counterparty_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    created_by: bigint("created_by", { mode: "number" }).notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type"),
    parent_counterparty_key: bigint("parent_counterparty_key", {
      mode: "number",
    }),
    authority_role_key: bigint("authority_role_key", {
      mode: "number",
    }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("counterparty_tenant_key_code_revision_key").on(
      t.tenant_key,
      t.code,
      t.revision
    ),
  ]
);

// ============================================================
// トランザクション系 (voucher, journal, journal_line)
// ============================================================

export const voucher = s.table(
  "voucher",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.voucher_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    created_by: bigint("created_by", { mode: "number" }).notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    idempotency_key: text("idempotency_key").notNull(),
    voucher_code: text("voucher_code"),
    description: text("description"),
    source_system: text("source_system"),
    type: text("type"),
    sequence_no: integer("sequence_no").notNull(),
    prev_header_hash: text("prev_header_hash").notNull(),
    header_hash: text("header_hash").notNull(),
    authority_role_key: bigint("authority_role_key", {
      mode: "number",
    }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.revision] }),
    uniqueIndex("uq_voucher_idempotency")
      .on(t.tenant_key, t.idempotency_key)
      .where(sql`revision = 1`),
    uniqueIndex("uq_voucher_code")
      .on(t.tenant_key, t.voucher_code)
      .where(sql`voucher_code IS NOT NULL AND revision = 1`),
  ]
);

export const journal = s.table(
  "journal",
  {
    key: bigint("key", { mode: "number" })
      .default(sql`nextval('data_stockflow.journal_key_seq')`)
      .notNull(),
    revision: integer("revision").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_from: timestamp("valid_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    valid_to: timestamp("valid_to", { withTimezone: true }),
    lines_hash: text("lines_hash").notNull(),
    prev_revision_hash: text("prev_revision_hash").notNull(),
    revision_hash: text("revision_hash").notNull(),
    created_by: bigint("created_by", { mode: "number" }).notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    voucher_key: bigint("voucher_key", { mode: "number" }).notNull(),
    book_key: bigint("book_key", { mode: "number" }).notNull(),
    posted_at: timestamp("posted_at", { withTimezone: true }).notNull(),
    type: text("type"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    adjustment_flag: text("adjustment_flag").default("none").notNull(),
    description: text("description"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    authority_role_key: bigint("authority_role_key", {
      mode: "number",
    }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.revision] })]
);

export const journalLine = s.table(
  "journal_line",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    journal_key: bigint("journal_key", { mode: "number" }).notNull(),
    journal_revision: integer("journal_revision").notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    sort_order: integer("sort_order").notNull(),
    side: text("side").notNull(),
    account_key: bigint("account_key", { mode: "number" }).notNull(),
    counterparty_key: bigint("counterparty_key", { mode: "number" }),
    amount: decimal("amount").notNull(),
    description: text("description"),
  },
  (t) => [
    foreignKey({
      columns: [t.journal_key, t.journal_revision],
      foreignColumns: [journal.key, journal.revision],
    }),
    index("idx_journal_line_journal").on(t.journal_key, t.journal_revision),
  ]
);

// ============================================================
// API Key
// ============================================================

export const apiKey = s.table(
  "api_key",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    user_key: bigint("user_key", { mode: "number" }).notNull(),
    tenant_key: bigint("tenant_key", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    key_prefix: text("key_prefix").notNull(),
    key_hash: text("key_hash").notNull(),
    role: text("role").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_api_key_user").on(t.user_key),
    index("idx_api_key_prefix").on(t.key_prefix),
  ]
);

// ============================================================
// 監査ログ (system_log + event_log → audit_log に統合)
// ============================================================

export const auditLog = s.table(
  "audit_log",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    tenant_key: bigint("tenant_key", { mode: "number" }),
    user_key: bigint("user_key", { mode: "number" }).notNull(),
    user_name: text("user_name").notNull(),
    user_role: text("user_role").notNull(),
    action: text("action").notNull(),
    entity_type: text("entity_type").notNull(),
    entity_key: bigint("entity_key", { mode: "number" }).notNull(),
    entity_name: text("entity_name"),
    revision: integer("revision"),
    summary: text("summary"),
    changes: jsonb("changes"),
    source_ip: text("source_ip"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_audit_log_tenant_created").on(t.tenant_key, t.created_at),
    index("idx_audit_log_entity").on(t.entity_type, t.entity_key),
  ]
);

// ============================================================
// 装飾系 (mutable, append-only 対象外)
// ============================================================

export const entityColor = s.table(
  "entity_color",
  {
    entity_type: text("entity_type").notNull(),
    entity_key: bigint("entity_key", { mode: "number" }).notNull(),
    color: text("color").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entity_type, t.entity_key] })]
);
