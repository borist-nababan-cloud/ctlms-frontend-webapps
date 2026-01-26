
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
  connectionString,
});

async function findOwner() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT u.usename 
      FROM pg_class c 
      JOIN pg_user u ON c.relowner = u.usesysid 
      WHERE relname = 'user_profiles';
    `);
    if (res.rows.length > 0) {
        console.log('Owner:', res.rows[0].usename);
    } else {
        console.log('Table not found');
    }
  } catch (err) {
    console.error('Error', err);
  } finally {
    await client.end();
  }
}

findOwner();
