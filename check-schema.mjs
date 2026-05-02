import postgres from "postgres";
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
try {
  const wanted = ['street_view_url','satellite_url','roadmap_url','lat','lng','user_scenario','appeal_strength_score','confidence_score','comp_quality_score','estimated_market_value_low','estimated_market_value_high','appeal_deadline','market_value','potential_savings','tax_rate_override','county','assessor','condition_notes'];
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='property_submissions' AND table_schema='public' ORDER BY column_name`;
  const have = cols.map(c => c.column_name);
  console.log("HAVE", have.length, "columns");
  const missing = wanted.filter(w => !have.includes(w));
  console.log("MISSING:", missing.join(", ") || "(none)");
  const m = await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`.catch(async () => {
    return await sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id`.catch(() => null);
  });
  if (m) console.log("MIGRATIONS:", m.length, m.map(x => x.hash).slice(-5));
  else console.log("no drizzle migrations table");
} catch(e) { console.log("ERR:", e.message); }
await sql.end({ timeout: 1 });
