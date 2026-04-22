import { Hono } from "hono";
import { logger } from "hono/logger";
import { health } from "./routes/health.js";

const v1 = new Hono();

v1.use("*", logger());

v1.route("/health", health);

const app = new Hono().basePath("/api");
app.route("/v1", v1);

export default app;
