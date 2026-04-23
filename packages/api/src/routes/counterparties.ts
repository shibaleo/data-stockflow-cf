import { createApp } from "../lib/create-app.js";
import { counterparty } from "../lib/db/schema.js";
import { requireAuth } from "../middleware/guards.js";
import { counterpartyResponseSchema, createCounterpartySchema, updateCounterpartySchema } from "../lib/validators.js";
import { createMapper, defineCrudRoutes, registerCrudHandlers } from "../lib/crud-factory.js";
import { checkReferences } from "../lib/append-only.js";

type CurrentCounterparty = {
  key: number; revision: number; code: string; name: string;
  type: string | null; parent_counterparty_key: number | null;
  authority_role_key: number; is_active: boolean;
  created_at: Date | string; revision_hash: string; created_by: number;
};

const app = createApp();
app.use("*", requireAuth());

const routes = defineCrudRoutes("Counterparties", "counterpartyId", counterpartyResponseSchema, createCounterpartySchema, updateCounterpartySchema);

registerCrudHandlers<CurrentCounterparty>(app, routes, {
  table: counterparty, tableName: "counterparty", viewName: "current_counterparty", historyView: "history_counterparty",
  entityType: "counterparty", entityLabel: "取引先", idParam: "counterpartyId",
  mapRow: createMapper<CurrentCounterparty>([], ["parent_counterparty_key"]),
  scope: () => null,
  buildCreate: (body, c) => ({
    code: body.code, name: body.name,
    type: body.type ?? null,
    parent_counterparty_key: body.parent_counterparty_id ?? null,
    authority_role_key: c.get("roleKey"),
    created_by: c.get("userKey"),
  }),
  hashCreate: (body) => ({ code: body.code, name: body.name }),
  buildUpdate: (body, cur, c) => ({
    code: body.code ?? cur.code,
    name: body.name ?? cur.name,
    type: body.type !== undefined ? body.type : cur.type,
    parent_counterparty_key: body.parent_counterparty_id !== undefined ? body.parent_counterparty_id : cur.parent_counterparty_key,
    authority_role_key: cur.authority_role_key,
    is_active: body.is_active ?? cur.is_active, created_by: c.get("userKey"),
  }),
  hashUpdate: (body, cur) => ({ code: body.code ?? cur.code, name: body.name ?? cur.name }),
  buildDeactivate: (cur, c) => ({
    code: cur.code,
    name: cur.name, type: cur.type,
    parent_counterparty_key: cur.parent_counterparty_key,
    authority_role_key: cur.authority_role_key,
    created_by: c.get("userKey"),
  }),
  hashDeactivate: (cur) => ({ code: cur.code, name: cur.name }),
  canPurge: (key) => checkReferences("counterparty_key", key, ["counterparty"]),
  hasAuthority: true,
});

export default app;
