
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumn(table, col) {
  const { error } = await supabase.from(table).select(col).limit(1);
  if (error && error.message.includes('does not exist')) {
    return `MISSING (${col})`;
  } else if (error) {
    return `ERROR (${error.message})`;
  }
  return `EXISTS (${col})`;
}

async function inspect() {
  console.log('--- Inspecting user_profiles ---');
  
  const columnsToCheck = [
    'uuid', 
    'id', 
    'user_id', 
    'email', 
    'role_id', 
    'role', 
    'user_role', 
    'roles',
    'user_role',
    'wh_id',
    'real_name',
    'full_name',
    'fullname',
    'avatar_url',
    'avatar'
  ];

  for (const col of columnsToCheck) {
    const result = await checkColumn('user_profiles', col);
    console.log(`${col}: ${result}`);
  }

  console.log('\n--- Inspecting user_roles ---');
  const roleCols = ['id', 'role_name', 'name', 'role'];
  for (const col of roleCols) {
    const result = await checkColumn('user_roles', col);
    console.log(`${col}: ${result}`);
  }
}

inspect();
