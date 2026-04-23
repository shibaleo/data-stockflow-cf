import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

const S = "data_stockflow";

/**
 * List current (latest active revision) records from a current_* view.
 * Cursor-based pagination using key (monotonically increasing).
 */
export async function listCurrent<T>(
  viewName: string,
  scopeFilter: { book_key: number } | null,
  options: {
    limit?: number;
    cursor?: number;
    activeOnly?: boolean;
  } = {}
): Promise<T[]> {
  const limit = Math.min(options.limit ?? 100, 200);
  const activeClause = options.activeOnly ? sql`AND is_active = true` : sql``;
  const cursorClause = options.cursor
    ? sql`AND key < ${options.cursor}`
    : sql``;

  if (scopeFilter) {
    const rows = await db.execute(sql`
      SELECT * FROM ${sql.raw(`"${S}"."${viewName}"`)}
      WHERE "book_key" = ${scopeFilter.book_key}
        ${activeClause} ${cursorClause}
      ORDER BY key DESC
      LIMIT ${limit}
    `);
    return rows as T[];
  }

  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}"."${viewName}"`)}
    WHERE 1=1 ${activeClause} ${cursorClause}
    ORDER BY key DESC
    LIMIT ${limit}
  `);
  return rows as T[];
}

/**
 * Get a single current record by key columns.
 */
export async function getCurrent<T>(
  viewName: string,
  keyFilter: Record<string, unknown>
): Promise<T | null> {
  const keys = Object.keys(keyFilter);
  const whereParts = keys.map((k) => {
    const val = keyFilter[k];
    return sql`${sql.raw(`"${k}"`)} = ${val}`;
  });
  const whereClause = whereParts.reduce(
    (acc, part) => sql`${acc} AND ${part}`
  );

  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}"."${viewName}"`)}
    WHERE ${whereClause}
    LIMIT 1
  `);
  return (rows[0] as T) ?? null;
}

/**
 * List latest revision per key from raw table (ignores valid_to).
 * Used by platform scope to include purged entities.
 */
export async function listLatest<T>(
  tableName: string,
  scopeFilter: { book_key: number } | null,
  options: {
    limit?: number;
    cursor?: number;
    activeOnly?: boolean;
  } = {}
): Promise<T[]> {
  const limit = Math.min(options.limit ?? 100, 200);
  const cursorClause = options.cursor
    ? sql`AND key < ${options.cursor}`
    : sql``;

  let scopeClause = sql``;
  if (scopeFilter) {
    scopeClause = sql`AND book_key = ${scopeFilter.book_key}`;
  }

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (key) *
    FROM ${sql.raw(`"${S}"."${tableName}"`)}
    WHERE 1=1 ${scopeClause} ${cursorClause}
    ORDER BY key, created_at DESC
  `);
  let filtered = rows as T[];
  if (options.activeOnly) {
    filtered = filtered.filter(
      (r) => (r as T & { is_active: boolean }).is_active
    );
  }
  filtered.sort(
    (a, b) =>
      (b as T & { key: number }).key - (a as T & { key: number }).key
  );
  return filtered.slice(0, limit);
}

/**
 * Get latest revision for a single entity from raw table (ignores valid_to).
 */
export async function getLatest<T>(
  tableName: string,
  entityKey: number
): Promise<T | null> {
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}"."${tableName}"`)}
    WHERE key = ${entityKey}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return (rows[0] as T) ?? null;
}

/**
 * Get the maximum revision number for a given entity key.
 */
export async function getMaxRevision(
  tableName: string,
  entityKey: number
): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(MAX(revision), 0) as max_rev
    FROM ${sql.raw(`"${S}"."${tableName}"`)}
    WHERE key = ${entityKey}
  `);
  return Number((rows[0] as unknown as { max_rev: bigint | null })?.max_rev ?? 0);
}

/**
 * List all revisions for an entity (history view).
 */
export async function listHistory<T>(
  viewName: string,
  entityKey: number
): Promise<T[]> {
  const rows = await db.execute(sql`
    SELECT * FROM ${sql.raw(`"${S}"."${viewName}"`)}
    WHERE key = ${entityKey}
    ORDER BY revision ASC
  `);
  return rows as T[];
}

/** Decode cursor string → key number. */
export function decodeCursor(cursor: string): number | undefined {
  const n = Number(cursor);
  return Number.isFinite(n) ? n : undefined;
}

/** Encode cursor from a row's key. */
export function encodeCursor(row: { key: number }): string {
  return String(row.key);
}

// ── Table name → display label (for reference-check error messages) ──
// v4: removed department, project, display_account, category, entity_category

const TABLE_LABELS: Record<string, string> = {
  journal_line: "journal_line",
  journal: "journal",
  account: "account",
  counterparty: "counterparty",
  voucher: "voucher",
  book: "book",
};

const CURRENT_VIEW_MAP: Record<string, string> = {
  role: "current_role",
  user: "current_user",
  book: "current_book",
  account: "current_account",
  counterparty: "current_counterparty",
  voucher: "current_voucher",
  journal: "current_journal",
  journal_line: "current_journal_line",
};

/**
 * Check if any current record references the given entity key
 * via a column named `{columnName}`.
 */
export async function checkReferences(
  columnName: string,
  entityKey: number,
  excludeTables: string[] = []
): Promise<string | null> {
  const cols = await db.execute(sql`
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = ${S}
      AND c.column_name = ${columnName}
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  `);

  const excludeSet = new Set(excludeTables);
  for (const col of cols as unknown as { table_name: string }[]) {
    const table = col.table_name;
    if (excludeSet.has(table)) continue;
    const target = CURRENT_VIEW_MAP[table] ?? table;
    const rows = await db.execute(sql`
      SELECT 1 FROM ${sql.raw(`"${S}"."${target}"`)}
      WHERE ${sql.raw(`"${columnName}"`)} = ${entityKey}
      LIMIT 1
    `);
    if (rows.length > 0) {
      const label = TABLE_LABELS[table] ?? table;
      return `Cannot purge: referenced by ${label}`;
    }
  }
  return null;
}
