// Wipe all sets (and dependent records via ON DELETE CASCADE)
// Usage: node scripts/wipe_all_sets.js
// Loads env from .env.local if present

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      const key = m[1];
      let value = m[2];
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    });
  } catch (e) {
    console.warn('Warning: failed to load .env.local:', e.message);
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Count before
  const { count: preCount, error: countErr1 } = await supabase
    .from('sets')
    .select('id', { head: true, count: 'exact' });
  if (countErr1) {
    console.error('Error counting sets:', countErr1.message);
    process.exit(1);
  }
  console.log('Sets before delete:', preCount ?? 0);

  // Supabase requires a filter for delete; use a safe always-true filter
  const { error: delErr, count: deletedCount } = await supabase
    .from('sets')
    .delete({ count: 'exact' })
    .not('id', 'is', null);
  if (delErr) {
    console.error('Delete error:', delErr.message);
    process.exit(1);
  }
  console.log('Sets deleted:', deletedCount ?? 0);

  // Count after
  const { count: postCount, error: countErr2 } = await supabase
    .from('sets')
    .select('id', { head: true, count: 'exact' });
  if (countErr2) {
    console.error('Error counting sets after delete:', countErr2.message);
    process.exit(1);
  }
  console.log('Sets after delete:', postCount ?? 0);

  if ((postCount ?? 0) === 0) {
    console.log('Success: all sets removed. Dependent records cascaded.');
  } else {
    console.warn('Warning: some sets remain. Check RLS or constraints.');
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});