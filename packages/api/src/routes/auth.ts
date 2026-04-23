import { Hono } from "hono";
import { signToken } from "../lib/auth.js";
import type { UserRole } from "../middleware/context.js";
import type { AppVariables } from "../middleware/context.js";

type Env = { Variables: AppVariables };
const app = new Hono<Env>();

const ROLES: readonly string[] = ["platform", "admin", "user", "auditor"];

/**
 * POST /auth/token
 * Development token generation endpoint.
 * Protected by X-Auth-Secret header.
 */
app.post("/token", async (c) => {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return c.json({ error: "AUTH_SECRET is not configured" }, 500);
  }

  const headerSecret = c.req.header("X-Auth-Secret");
  if (headerSecret !== authSecret) {
    return c.json({ error: "Invalid auth secret" }, 401);
  }

  const body = await c.req.json<{
    user_id?: string;
    role?: string;
  }>();

  if (!body.user_id || !body.role) {
    return c.json(
      { error: "user_id and role are required" },
      400
    );
  }

  if (!ROLES.includes(body.role)) {
    return c.json(
      { error: `Invalid role. Must be one of: ${ROLES.join(", ")}` },
      400
    );
  }

  const token = await signToken(
    Number(body.user_id),
    body.role as UserRole
  );

  return c.json({ token, expires_in: 86400 }, 200);
});

export default app;
