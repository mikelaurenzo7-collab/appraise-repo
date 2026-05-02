import postgres from "postgres";
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
await sql`UPDATE property_submissions SET status='pending' WHERE id=3`;
const r = await sql`SELECT id, status FROM property_submissions WHERE id=3`;
console.log("reset:", JSON.stringify(r[0]));
await sql.end({ timeout: 1 });
