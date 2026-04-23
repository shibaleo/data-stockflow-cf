import { createApp } from "../lib/create-app.js";
import { book } from "../lib/db/schema.js";
import { requireAuth } from "../middleware/guards.js";
import { bookResponseSchema, createBookSchema, updateBookSchema } from "../lib/validators.js";
import { createMapper, defineCrudRoutes, registerCrudHandlers } from "../lib/crud-factory.js";

type CurrentBook = {
  key: number; revision: number; code: string; name: string;
  unit: string; unit_symbol: string; unit_position: string; type: string | null;
  type_labels: object; authority_role_key: number; is_active: boolean;
  created_at: Date | string; revision_hash: string; created_by: number;
};

const app = createApp();
app.use("*", requireAuth());

const routes = defineCrudRoutes("Books", "bookId", bookResponseSchema, createBookSchema, updateBookSchema);

registerCrudHandlers<CurrentBook>(app, routes, {
  table: book, tableName: "book", viewName: "current_book", historyView: "history_book",
  entityType: "book", entityLabel: "帳簿", idParam: "bookId",
  mapRow: createMapper<CurrentBook>(),
  scope: () => null,
  buildCreate: (body, c) => ({
    code: body.code, name: body.name,
    unit: body.unit, unit_symbol: body.unit_symbol ?? "",
    unit_position: body.unit_position ?? "left",
    type: body.type ?? null,
    type_labels: body.type_labels ?? {},
    authority_role_key: c.get("roleKey"),
    created_by: c.get("userKey"),
  }),
  hashCreate: (body) => ({ code: body.code, name: body.name, unit: body.unit }),
  buildUpdate: (body, cur, c) => ({
    code: body.code ?? cur.code,
    name: body.name ?? cur.name, unit: body.unit ?? cur.unit,
    unit_symbol: body.unit_symbol ?? cur.unit_symbol,
    unit_position: body.unit_position ?? cur.unit_position,
    type: body.type !== undefined ? body.type : cur.type,
    type_labels: body.type_labels ?? (cur.type_labels as object),
    authority_role_key: cur.authority_role_key,
    is_active: body.is_active ?? cur.is_active, created_by: c.get("userKey"),
  }),
  hashUpdate: (body, cur) => ({ code: body.code ?? cur.code, name: body.name ?? cur.name, unit: body.unit ?? cur.unit }),
  buildDeactivate: (cur, c) => ({
    code: cur.code,
    name: cur.name, unit: cur.unit, unit_symbol: cur.unit_symbol,
    unit_position: cur.unit_position, type: cur.type,
    type_labels: cur.type_labels as object,
    authority_role_key: cur.authority_role_key,
    created_by: c.get("userKey"),
  }),
  hashDeactivate: (cur) => ({ code: cur.code, name: cur.name, unit: cur.unit }),
  hasAuthority: true,
});

export default app;
