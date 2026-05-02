import postgres from "postgres";
process.stdout.write("starting\n");
const url = "postgresql://postgres.paixbscktsamtgjjlkdm:appraiseaivercel@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
process.stdout.write("connected\n");

async function main() {
  const wantedEnums = {
    filing_method: ["poa","pro-se","none","automated_standard","automated_express"],
    recommended_approach: ["poa","pro-se","automated_standard","automated_express","not-recommended"],
    user_scenario: ["primary_residence","rental_property","vacation_home","inherited_property","recently_purchased","planning_to_sell","distressed_condition","new_construction","recently_renovated","senior_homestead","veteran_disability","financial_hardship","mixed_use","none"],
    submission_status: ["pending","analyzing","analyzed","error","contacted","appeal-filed","hearing-scheduled","won","lost","withdrawn","archived"],
  };
  for (const [enumName, wanted] of Object.entries(wantedEnums)) {
    const rows = await sql`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = ${enumName}`;
    const have = rows.map(r => r.enumlabel);
    const missing = wanted.filter(w => !have.includes(w));
    process.stdout.write(`${enumName}: have=[${have.join(",")}] missing=[${missing.join(",")}]\n`);
    for (const m of missing) {
      try {
        await sql.unsafe(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${m.replace(/'/g, "''")}'`);
        process.stdout.write(`  + added ${m}\n`);
      } catch (err) {
        process.stdout.write(`  ! failed ${m}: ${err.message}\n`);
      }
    }
  }
  process.stdout.write("done\n");
}

try {
  await main();
} catch (e) {
  process.stdout.write("TOP ERR: " + e.message + "\n");
} finally {
  await sql.end({ timeout: 2 });
  process.stdout.write("ended\n");
}
