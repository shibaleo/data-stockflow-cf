import { createApp } from "../lib/create-app.js";
import { account } from "../lib/db/schema.js";
import { requireAuth, requireBook } from "../middleware/guards.js";
import { accountResponseSchema, createAccountSchema, updateAccountSchema } from "../lib/validators.js";
import { createMapper, defineCrudRoutes, registerCrudHandlers } from "../lib/crud-factory.js";
import { checkReferences } from "../lib/append-only.js";

type CurrentAccount = {
  key: number; revision: number; book_key: number; code: string; name: string;
  account_type: string; classification: string | null; sign: number;
  parent_account_key: number | null; sort_order: number;
  authority_role_key: number; is_active: boolean;
  created_at: Date | string; revision_hash: string; created_by: number;
};

const app = createApp();
app.use("*", requireAuth(), requireBook());

const routes = defineCrudRoutes("Accounts", "accountId", accountResponseSchema, createAccountSchema, updateAccountSchema);

registerCrudHandlers<CurrentAccount>(app, routes, {
  table: account, tableName: "account", viewName: "current_account", historyView: "history_account",
  entityType: "account", entityLabel: "科目", idParam: "accountId",
  mapRow: createMapper<CurrentAccount>([], ["book_key", "parent_account_key"]),
  scope: (c) => ({ book_key: c.get("bookKey") }),
  buildCreate: (body, c) => ({
    book_key: c.get("bookKey"), code: body.code, name: body.name,
    account_type: body.account_type,
    classification: body.classification ?? null,
    parent_account_key: body.parent_account_id ?? null,
    sort_order: body.sort_order ?? 0,
    authority_role_key: c.get("roleKey"),
    created_by: c.get("userKey"),
  }),
  hashCreate: (body) => ({ code: body.code, name: body.name, account_type: body.account_type }),
  buildUpdate: (body, cur, c) => ({
    book_key: c.get("bookKey"), code: body.code ?? cur.code,
    name: body.name ?? cur.name, account_type: body.account_type ?? cur.account_type,
    classification: body.classification !== undefined ? body.classification : cur.classification,
    parent_account_key: body.parent_account_id !== undefined ? body.parent_account_id : cur.parent_account_key,
    sort_order: body.sort_order ?? cur.sort_order,
    authority_role_key: cur.authority_role_key,
    is_active: body.is_active ?? cur.is_active, created_by: c.get("userKey"),
  }),
  hashUpdate: (body, cur) => ({ code: body.code ?? cur.code, name: body.name ?? cur.name, account_type: body.account_type ?? cur.account_type }),
  buildDeactivate: (cur, c) => ({
    book_key: c.get("bookKey"), code: cur.code,
    name: cur.name, account_type: cur.account_type,
    classification: cur.classification,
    parent_account_key: cur.parent_account_key,
    sort_order: cur.sort_order,
    authority_role_key: cur.authority_role_key,
    created_by: c.get("userKey"),
  }),
  hashDeactivate: (cur) => ({ code: cur.code, name: cur.name, account_type: cur.account_type }),
  canPurge: (key) => checkReferences("account_key", key, ["account"]),
  hasAuthority: true,
});

export default app;
