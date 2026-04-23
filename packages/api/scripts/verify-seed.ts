import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

const roles = await sql`SELECT key, code, name FROM data_stockflow.role`;
console.log("Roles:", JSON.stringify(roles));

const users = await sql`SELECT key, code, name, email FROM data_stockflow."user"`;
console.log("Users:", JSON.stringify(users));

await sql.end();
