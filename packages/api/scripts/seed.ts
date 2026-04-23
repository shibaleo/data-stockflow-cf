import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// 1. Role: platform (key=1)
await sql`
  INSERT INTO data_stockflow.role (key, revision, lines_hash, prev_revision_hash, revision_hash, code, name, is_active)
  VALUES (1, 1, 'seed', 'seed', 'seed', 'platform', 'Platform Admin', true)
  ON CONFLICT DO NOTHING
`;
console.log("Role inserted");

// 2. User: initial admin (key=1)
await sql`
  INSERT INTO data_stockflow."user" (key, revision, lines_hash, prev_revision_hash, revision_hash, role_key, code, name, email, type, is_active)
  VALUES (1, 1, 'seed', 'seed', 'seed', 1, 'admin', 'shibaleo', 'shiba.dog.leo.private@gmail.com', 'admin', true)
  ON CONFLICT DO NOTHING
`;
console.log("User inserted");

// Verify
const roles = await sql`SELECT key, code, name FROM data_stockflow.role`;
console.log("Roles:", JSON.stringify(roles));

const users = await sql`SELECT key, code, name, email FROM data_stockflow."user"`;
console.log("Users:", JSON.stringify(users));

await sql.end();
console.log("Seed complete");
