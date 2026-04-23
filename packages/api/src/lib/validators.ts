import { z } from "@hono/zod-openapi";

// ── Sanitisation ──

export function sanitize(value: string): string {
  return value.trim();
}

export function zSanitized(schema: z.ZodString = z.string()) {
  return z.preprocess((v) => (typeof v === "string" ? sanitize(v) : v), schema);
}

// ── Common response helpers ──

export const errorSchema = z.object({ error: z.string() });
export const messageSchema = z.object({ message: z.string() });

export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    next_cursor: z.string().nullable(),
  });
}

export function dataSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({ data: itemSchema });
}

export const listQuerySchema = z.object({
  limit: z.string().optional().openapi({ example: "100" }),
  cursor: z.string().optional().openapi({ description: "Last key from previous page" }),
  include_inactive: z.string().optional().openapi({ description: "Include inactive items" }),
});

// ── Role ──

export const roleResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  revision: z.number(),
  created_at: z.string(),
});

export const createRoleSchema = z.object({
  code: zSanitized(z.string().min(1).max(50)),
  name: zSanitized(z.string().min(1).max(200)),
});

export const updateRoleSchema = z.object({
  code: zSanitized(z.string().min(1).max(100)).optional(),
  name: zSanitized(z.string().min(1).max(200)).optional(),
});

// ── User ──

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  external_id: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  role_id: z.number(),
  is_active: z.boolean(),
  revision: z.number(),
  created_at: z.string(),
});

export const createUserSchema = z.object({
  email: zSanitized(z.string().email()),
  code: zSanitized(z.string().min(1).max(50)),
  name: zSanitized(z.string().min(1).max(200)),
  role_id: z.number().int().positive(),
  type: z.string().optional(),
});

export const updateUserSchema = z.object({
  code: zSanitized(z.string().min(1).max(100)).optional(),
  name: zSanitized(z.string().min(1).max(200)).optional(),
  role_id: z.number().int().positive().optional(),
  type: z.string().nullable().optional(),
});

// ── Book ──

const typeLabelsSchema = z
  .record(z.string(), z.string().max(50))
  .openapi({ example: { asset: "在庫", revenue: "入荷" } });

export const bookResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  unit_symbol: z.string(),
  unit_position: z.string(),
  type: z.string().nullable(),
  type_labels: z.record(z.string(), z.string()),
  authority_role_key: z.number(),
  is_active: z.boolean(),
  revision: z.number(),
  created_at: z.string(),
});

export const createBookSchema = z.object({
  code: zSanitized(z.string().min(1).max(50)),
  name: zSanitized(z.string().min(1).max(200)),
  unit: zSanitized(z.string().min(1).max(50)),
  unit_symbol: zSanitized(z.string().max(20)).optional(),
  unit_position: z.enum(["left", "right"]).optional(),
  type: z.string().optional(),
  type_labels: typeLabelsSchema.optional(),
});

export const updateBookSchema = z.object({
  code: zSanitized(z.string().min(1).max(100)).optional(),
  name: zSanitized(z.string().min(1).max(200)).optional(),
  unit: zSanitized(z.string().min(1).max(50)).optional(),
  unit_symbol: zSanitized(z.string().max(20)).optional(),
  unit_position: z.enum(["left", "right"]).optional(),
  type: z.string().nullable().optional(),
  type_labels: typeLabelsSchema.optional(),
});

// ── Account ──

const accountTypeEnum = z.enum([
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const accountResponseSchema = z.object({
  id: z.number(),
  book_id: z.number(),
  code: z.string(),
  name: z.string(),
  account_type: z.string(),
  classification: z.string().nullable(),
  authority_role_key: z.number(),
  is_active: z.boolean(),
  parent_account_id: z.number().nullable(),
  sort_order: z.number(),
  sign: z.number(),
  revision: z.number(),
  created_at: z.string(),
});

export const createAccountSchema = z.object({
  code: zSanitized(z.string().min(1).max(50)),
  name: zSanitized(z.string().min(1).max(200)),
  account_type: accountTypeEnum,
  classification: z.string().optional(),
  parent_account_id: z.number().int().positive().optional(),
  sort_order: z.number().int().optional(),
});

export const updateAccountSchema = z.object({
  code: zSanitized(z.string().min(1).max(100)).optional(),
  name: zSanitized(z.string().min(1).max(200)).optional(),
  account_type: accountTypeEnum.optional(),
  classification: z.string().nullable().optional(),
  parent_account_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().optional(),
});

// ── Counterparty ──

export const counterpartyResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  authority_role_key: z.number(),
  is_active: z.boolean(),
  parent_counterparty_id: z.number().nullable(),
  revision: z.number(),
  created_at: z.string(),
});

export const createCounterpartySchema = z.object({
  code: zSanitized(z.string().min(1).max(50)),
  name: zSanitized(z.string().min(1).max(200)),
  type: z.string().optional(),
  parent_counterparty_id: z.number().int().positive().optional(),
});

export const updateCounterpartySchema = z.object({
  code: zSanitized(z.string().min(1).max(100)).optional(),
  name: zSanitized(z.string().min(1).max(200)).optional(),
  type: z.string().nullable().optional(),
  parent_counterparty_id: z.number().int().positive().nullable().optional(),
});

// ── Voucher ──

export const voucherResponseSchema = z.object({
  id: z.number(),
  revision: z.number(),
  idempotency_key: z.string(),
  voucher_code: z.string().nullable(),
  description: z.string().nullable(),
  source_system: z.string().nullable(),
  type: z.string().nullable(),
  authority_role_key: z.number(),
  created_at: z.string(),
});

export const updateVoucherSchema = z.object({
  voucher_code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source_system: z.string().nullable().optional(),
});

export const voucherDetailResponseSchema = voucherResponseSchema.extend({
  journals: z.array(z.lazy(() => journalDetailResponseSchema)),
});

// ── Journal ──

export const journalLineResponseSchema = z.object({
  uuid: z.string(),
  sort_order: z.number(),
  side: z.string(),
  account_id: z.number(),
  counterparty_id: z.number().nullable(),
  amount: z.string(),
  description: z.string().nullable(),
});

export const journalResponseSchema = z.object({
  id: z.number(),
  voucher_id: z.number(),
  book_id: z.number(),
  posted_at: z.string(),
  revision: z.number(),
  is_active: z.boolean(),
  type: z.string().nullable(),
  tags: z.array(z.string()),
  authority_role_key: z.number(),
  adjustment_flag: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export const journalDetailResponseSchema = journalResponseSchema.extend({
  lines: z.array(journalLineResponseSchema),
});

export const journalLineSchema = z.object({
  sort_order: z.number().int().min(1),
  side: z.enum(["debit", "credit"]),
  account_id: z.number().int().positive(),
  counterparty_id: z.number().int().positive().nullable().optional(),
  amount: z.number().positive("amount must be positive"),
  description: z.string().optional(),
});

export const createVoucherSchema = z.object({
  idempotency_key: zSanitized(z.string().min(1)),
  voucher_code: z.string().optional(),
  description: z.string().optional(),
  source_system: z.string().optional(),
  type: z.string().optional(),
  journals: z
    .array(
      z.object({
        book_id: z.number().int().positive(),
        posted_at: z.string().datetime(),
        type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        adjustment_flag: z
          .enum(["none", "adjustment", "reversal", "correction"])
          .default("none"),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        lines: z.array(journalLineSchema).min(2),
      })
    )
    .min(1),
});

export const updateJournalSchema = z.object({
  book_id: z.number().int().positive().optional(),
  posted_at: z.string().datetime().optional(),
  type: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  adjustment_flag: z
    .enum(["none", "adjustment", "reversal", "correction"])
    .optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
  lines: z.array(journalLineSchema).min(2),
});

// ── Audit Log ──

export const auditLogResponseSchema = z.object({
  uuid: z.string(),
  user_name: z.string(),
  user_role: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_key: z.number(),
  entity_name: z.string().nullable(),
  revision: z.number().nullable(),
  summary: z.string().nullable(),
  changes: z.unknown().nullable(),
  source_ip: z.string().nullable(),
  created_at: z.string(),
});

export const auditLogQuerySchema = z.object({
  entity_type: z.string().optional(),
  action: z.string().optional(),
  limit: z.string().optional().openapi({ example: "50" }),
  cursor: z.string().optional(),
});
