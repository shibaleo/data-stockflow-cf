import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

const roles = await sql`SELECT key, code, name FROM data_stockflow.current_role`;
console.log("current_role:", JSON.stringify(roles));

const users = await sql`SELECT key, code, name, email, role_key FROM data_stockflow.current_user`;
console.log("current_user:", JSON.stringify(users));

// Test the join that auth.ts uses
const authTest = await sql`
  SELECT u.key, u.role_key, u.name, r.code as role_code
  FROM data_stockflow.current_user u
  JOIN data_stockflow.current_role r ON r.key = u.role_key
  WHERE u.email = 'shiba.dog.leo.private@gmail.com'
  LIMIT 1
`;
console.log("auth query result:", JSON.stringify(authTest));

await sql.end();
