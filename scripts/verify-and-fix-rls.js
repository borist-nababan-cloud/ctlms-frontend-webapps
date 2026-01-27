/**
 * VERIFY AND FIX RLS POLICIES
 *
 * This script:
 * 1. Connects to the database directly
 * 2. Checks current RLS policies
 * 3. Applies fixes if needed
 * 4. Tests the fixes
 *
 * Run with: node scripts/verify-and-fix-rls.js
 */

import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function checkRLSStatus() {
  console.log('\n=== CHECKING RLS STATUS ===\n');

  // Check user_profiles
  const userProfilesRLS = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname = 'user_profiles';
  `);

  console.log('user_profiles RLS:');
  if (userProfilesRLS.rows.length > 0) {
    console.log(`  - RLS Enabled: ${userProfilesRLS.rows[0].relrowsecurity}`);
  } else {
    console.log('  - Table NOT FOUND');
  }

  // Check trucking_logs
  const truckingLogsRLS = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname = 'trucking_logs';
  `);

  console.log('\ntrucking_logs RLS:');
  if (truckingLogsRLS.rows.length > 0) {
    console.log(`  - RLS Enabled: ${truckingLogsRLS.rows[0].relrowsecurity}`);
  } else {
    console.log('  - Table NOT FOUND');
  }
}

async function checkPolicies() {
  console.log('\n=== CHECKING POLICIES ===\n');

  // Check user_profiles policies
  const userProfilesPolicies = await client.query(`
    SELECT schemaname, tablename, policyname, cmd, permissive
    FROM pg_policies
    WHERE tablename = 'user_profiles'
    ORDER BY policyname;
  `);

  console.log(`user_profiles Policies (${userProfilesPolicies.rows.length} found):`);
  if (userProfilesPolicies.rows.length === 0) {
    console.log('  ❌ NO POLICIES - This causes the timeout!');
  } else {
    userProfilesPolicies.rows.forEach(p => {
      console.log(`  ✓ ${p.policyname} (${p.cmd})`);
    });
  }

  // Check trucking_logs policies
  const truckingLogsPolicies = await client.query(`
    SELECT schemaname, tablename, policyname, cmd, permissive
    FROM pg_policies
    WHERE tablename = 'trucking_logs'
    ORDER BY policyname;
  `);

  console.log(`\ntrucking_logs Policies (${truckingLogsPolicies.rows.length} found):`);
  if (truckingLogsPolicies.rows.length === 0) {
    console.log('  ❌ NO POLICIES - This causes the 403 error!');
  } else {
    truckingLogsPolicies.rows.forEach(p => {
      console.log(`  ✓ ${p.policyname} (${p.cmd})`);
    });
  }
}

async function applyFix() {
  console.log('\n=== APPLYING FIX ===\n');

  const sqlPath = path.join(__dirname, '../docs/fix_all_rls_policies_comprehensive.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    return false;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.query(sql);
    console.log('✅ Fix applied successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error applying fix:', err.message);
    console.error('Details:', err);
    return false;
  }
}

async function testFix() {
  console.log('\n=== TESTING FIX ===\n');

  try {
    // Test user_profiles read
    console.log('Testing user_profiles read...');
    const profileTest = await client.query(`
      SELECT COUNT(*) as count
      FROM public.user_profiles;
    `);
    console.log(`✓ Can read user_profiles (${profileTest.rows[0].count} records)`);

    // Test trucking_logs read
    console.log('\nTesting trucking_logs read...');
    const truckingTest = await client.query(`
      SELECT COUNT(*) as count
      FROM public.trucking_logs;
    `);
    console.log(`✓ Can read trucking_logs (${truckingTest.rows[0].count} records)`);

    console.log('\n✅ All tests passed!');
    return true;
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFY AND FIX RLS POLICIES                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await checkRLSStatus();
    await checkPolicies();

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('Do you want to apply the fix? (This will create/update policies)');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Running in automatic mode...');

    const success = await applyFix();

    if (success) {
      await checkPolicies(); // Re-check to show new policies
      await testFix();
    }

  } catch (err) {
    console.error('❌ Fatal error:', err);
  } finally {
    await client.end();
    console.log('\n✓ Disconnected from database');
  }
}

main();
