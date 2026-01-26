
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPolicies() {
    console.log('--- Checking RLS Policies ---');
    
    // We can't directly check policies via client easily without admin, 
    // but we can try to Insert and see the error.
    
    const testUUID = '00000000-0000-0000-0000-000000000000';
    
    console.log('Attempting SELECT on non-existent user...');
    const { error: selectError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('uuid', testUUID)
        .single();
        
    console.log('Select Result:', selectError ? `Error: ${selectError.message}` : 'Success (No RLS blocking SELECT)');

    if (selectError && selectError.code === '42501') {
        console.error('RLS BLOCKING SELECT! (Permission denied)');
    }
}

checkPolicies();
