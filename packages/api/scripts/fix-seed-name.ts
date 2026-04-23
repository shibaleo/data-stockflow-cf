import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Delete old user row and re-insert with correct name
await sql`DELETE FROM data_stockflow."user" WHERE key = 1 AND revision = 1`;
await sql`
  INSERT INTO data_stockflow."user" (key, revision, lines_hash, prev_revision_hash, revision_hash, role_key, code, name, email, type, is_active)
  VALUES (1, 1, 'seed', 'seed', 'seed', 1, 'admin', 'shibaleo', 'shiba.dog.leo.private@gmail.com', 'admin', true)
`;
console.log("User name updated to shibaleo");

const users = await sql`SELECT key, code, name, email FROM data_stockflow."user"`;
console.log("Users:", JSON.stringify(users));

await sql.end();
