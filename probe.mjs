import postgres from "postgres";
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
try {
  const [{ now }] = await sql`SELECT now()`;
  console.log("✅ OK now=", now);
  await sql.end({ timeout: 1 });
} catch (e) {
  console.log("✗ code=", e.code, " msg=", (e.message||"").slice(0,200));
  try { await sql.end({ timeout: 1 }); } catch {}
  process.exit(1);
}
