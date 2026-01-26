
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function checkSuper() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT rolname, rolsuper, rolcreaterole 
      FROM pg_roles 
      WHERE rolname = 'postgres';
    `);
    console.log('User Role Info:', res.rows[0]);
  } catch (err) {
    console.error('Error', err);
  } finally {
    await client.end();
  }
}

checkSuper();
