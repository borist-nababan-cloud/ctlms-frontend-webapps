
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false // Node script doesn't need persistence
    }
});

async function runTest() {
    console.log('--- STARTING DEBUG TEST ---');
    const testUUID = '00000000-0000-0000-0000-000000000000'; // Non-existent UUID

    // Test 1: Limit(1)
    try {
        console.log('Test 1: select("*").eq("uuid", ...).limit(1)');
        const start1 = Date.now();
        const { data: data1, error: error1 } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('uuid', testUUID)
            .limit(1);
        console.log(`Test 1 Result (${Date.now() - start1}ms):`, error1 ? `Error: ${error1.message}` : `Success. Data length: ${data1 ? data1.length : 0}`);
    } catch (e) {
        console.error('Test 1 Exception:', e);
    }

    // Test 2: Single()
    try {
        console.log('Test 2: select("*").eq("uuid", ...).single()');
        const start2 = Date.now();
        const { data: data2, error: error2 } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('uuid', testUUID)
            .single();
        console.log(`Test 2 Result (${Date.now() - start2}ms):`, error2 ? `Error: ${error2.message} (Code: ${error2.code})` : 'Success (Found 1 row)');
    } catch (e) {
        console.error('Test 2 Exception:', e);
    }
    
    // Test 3: Maybe()
    try {
        console.log('Test 3: select("*").eq("uuid", ...).maybeSingle()');
        const start3 = Date.now();
        const { data: data3, error: error3 } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('uuid', testUUID)
            .maybeSingle();
        console.log(`Test 3 Result (${Date.now() - start3}ms):`, error3 ? `Error: ${error3.message}` : `Success. Data: ${data3 ? 'Found' : 'Null'}`);
    } catch (e) {
        console.error('Test 3 Exception:', e);
    }
}

runTest();
