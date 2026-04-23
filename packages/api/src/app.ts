import { Hono } from "hono";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error-handler.js";
import { contextMiddleware } from "./middleware/context.js";
import type { AppVariables } from "./middleware/context.js";
import { health } from "./routes/health.js";
import auth from "./routes/auth.js";
import roles from "./routes/roles.js";
import users from "./routes/users.js";
import books from "./routes/books.js";
import accounts from "./routes/accounts.js";
import counterparties from "./routes/counterparties.js";
import vouchers from "./routes/vouchers.js";
import journals from "./routes/journals.js";
import entityColors from "./routes/entity-colors.js";
import reports from "./routes/reports.js";
import auditLogs from "./routes/ops/audit-logs.js";
import integrity from "./routes/ops/integrity.js";
import journalOps from "./routes/ops/journal-ops.js";

export type Env = { Variables: AppVariables };

const v1 = new Hono<Env>();

v1.use("*", logger());
v1.onError(errorHandler);

// Public routes
v1.route("/health", health);
v1.route("/auth", auth);

// Auth middleware for all subsequent routes
v1.use("*", contextMiddleware);
v1.use("*", async (c, next) => {
  if (!c.get("userKey")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Protected routes — master
v1.route("/roles", roles);
v1.route("/users", users);
v1.route("/books", books);
v1.route("/books/:bookId/accounts", accounts);
v1.route("/counterparties", counterparties);

// Protected routes — transactions
v1.route("/vouchers", vouchers);
v1.route("/vouchers/:voucherId/journals", journals);

// Protected routes — other
v1.route("/entity-colors", entityColors);
v1.route("/reports", reports);

// Protected routes — ops
v1.route("/audit-logs", auditLogs);
v1.route("/integrity", integrity);
v1.route("/journal-ops", journalOps);

const app = new Hono().basePath("/api");
app.route("/v1", v1);

export default app;
