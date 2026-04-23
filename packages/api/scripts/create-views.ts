import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Create current_* views for all append-only tables.
// Each view returns only the latest revision per key where valid_to IS NULL (active).

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_role AS
  SELECT * FROM data_stockflow.role
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_user AS
  SELECT * FROM data_stockflow."user"
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_book AS
  SELECT * FROM data_stockflow.book
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_account AS
  SELECT * FROM data_stockflow.account
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_counterparty AS
  SELECT * FROM data_stockflow.counterparty
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_voucher AS
  SELECT * FROM data_stockflow.voucher
  WHERE valid_to IS NULL
`;

await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_journal AS
  SELECT * FROM data_stockflow.journal
  WHERE valid_to IS NULL
`;

console.log("All current_* views created.");

// Also add current_journal_line: lines for current journals
await sql`
  CREATE OR REPLACE VIEW data_stockflow.current_journal_line AS
  SELECT jl.*
  FROM data_stockflow.journal_line jl
  JOIN data_stockflow.current_journal cj
    ON cj.key = jl.journal_key AND cj.revision = jl.journal_revision
`;

console.log("current_journal_line view created.");

await sql.end();
console.log("Done.");
