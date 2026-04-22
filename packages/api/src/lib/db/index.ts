import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. DB queries will fail.");
}

const client = postgres(databaseUrl ?? "", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  types: {
    bigint: postgres.BigInt,
  },
});

export const db = drizzle(client, { schema });
export { client };
