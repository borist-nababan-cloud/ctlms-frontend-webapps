
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function applyPolicies() {
  await client.connect();
  console.log('Connected to DB');

  try {
    // Switch to owner
    await client.query(`SET ROLE supabase_admin;`);
    console.log('Switched to role: supabase_admin');

    // 1. Enable RLS (just in case, though checked it's on)
    await client.query(`ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;`);
    console.log('Ensure RLS enabled.');

    // 2. Policy: View own profile
    // We use DO logic or CREATE POLICY IF NOT EXISTS (pg 9.5+) but simple CREATE might fail if exists.
    // We'll try to drop first to be clean or interpret error.
    
    const policies = [
        {
            name: "Users can view own profile",
            command: `CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING ((select auth.uid()) = uuid);`
        },
        {
            name: "Users can insert own profile",
            command: `CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK ((select auth.uid()) = uuid);`
        },
        {
            name: "Users can update own profile",
            command: `CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING ((select auth.uid()) = uuid);`
        }
    ];

    for (const p of policies) {
        try {
            // Drop valid policy if exists to avoid conflict
            await client.query(`DROP POLICY IF EXISTS "${p.name}" ON user_profiles;`);
            await client.query(p.command);
            console.log(`Applied policy: ${p.name}`);
        } catch (e) {
            console.error(`Failed to apply policy ${p.name}:`, e.message);
        }
    }

  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.end();
  }
}

applyPolicies();
