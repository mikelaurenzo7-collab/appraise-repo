import postgres from "postgres";
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
console.log("EXISTING:");
console.log(tables.map(t=>t.tablename).join("\n"));
await sql.end({ timeout: 1 });
