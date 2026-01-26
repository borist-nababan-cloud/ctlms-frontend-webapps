
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function recreate() {
  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Drop existing table
    console.log('Dropping table user_profiles...');
    await client.query(`DROP TABLE IF EXISTS user_profiles CASCADE;`);
    console.log('Table dropped (if existed).');

    // 2. Create table
    // Note: auth.users might be in 'auth' schema.
    console.log('Creating table user_profiles...');
    await client.query(`
      CREATE TABLE public.user_profiles (
        uuid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        user_role BIGINT,
        wh_id UUID,
        real_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table created.');

    // 3. Enable RLS
    await client.query(`ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;`);
    console.log('RLS Enabled.');

    // 4. Create Policies
    await client.query(`
      CREATE POLICY "Users can view own profile" 
      ON public.user_profiles FOR SELECT 
      USING ((select auth.uid()) = uuid);
    `);
    
    await client.query(`
      CREATE POLICY "Users can insert own profile" 
      ON public.user_profiles FOR INSERT 
      WITH CHECK ((select auth.uid()) = uuid);
    `);

    await client.query(`
      CREATE POLICY "Users can update own profile" 
      ON public.user_profiles FOR UPDATE 
      USING ((select auth.uid()) = uuid);
    `);
    console.log('Policies created.');

    // 5. Grants
    await client.query(`GRANT ALL ON public.user_profiles TO postgres, anon, authenticated, service_role;`);
    console.log('Grants applied.');

  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.end();
  }
}

recreate();
