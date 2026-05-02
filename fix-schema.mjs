import postgres from "postgres";
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
try {
  await sql`ALTER TABLE property_submissions ADD COLUMN IF NOT EXISTS street_view_url varchar(500)`;
  await sql`ALTER TABLE property_submissions ADD COLUMN IF NOT EXISTS satellite_url varchar(500)`;
  await sql`ALTER TABLE property_submissions ADD COLUMN IF NOT EXISTS roadmap_url varchar(500)`;
  await sql`ALTER TABLE property_submissions ADD COLUMN IF NOT EXISTS lat varchar(20)`;
  await sql`ALTER TABLE property_submissions ADD COLUMN IF NOT EXISTS lng varchar(20)`;
  console.log("✅ Added missing columns");
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='property_submissions' AND column_name IN ('street_view_url','satellite_url','roadmap_url','lat','lng')`;
  console.log("verified:", cols.map(c=>c.column_name).join(","));
} catch(e) { console.log("ERR:", e.message); process.exit(1); }
await sql.end({ timeout: 1 });
