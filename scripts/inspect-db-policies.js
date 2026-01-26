
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function inspect() {
  await client.connect();
  console.log('Connected to DB');

  try {
    // Check if RLS is enabled (relrowsecurity = true)
    const resRLS = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'user_profiles';
    `);
    if (resRLS.rows.length > 0) {
        console.log('RLS Enabled:', resRLS.rows[0].relrowsecurity);
    } else {
        console.log('Table user_profiles not found in pg_class');
    }

    // Check policies
    const resPolicies = await client.query(`
      SELECT * 
      FROM pg_policies 
      WHERE tablename = 'user_profiles';
    `);
    console.log('Policies Found:', resPolicies.rows.length);
    resPolicies.rows.forEach(p => {
        console.log(`- Policy: ${p.policyname} | Action: ${p.cmd} | Roles: ${p.roles} | Using: ${p.qual} | Check: ${p.with_check}`);
    });
    
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.end();
  }
}

inspect();
