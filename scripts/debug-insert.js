
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function runTest() {
    console.log('--- STARTING INSERT DEBUG TEST ---');
    // We can't insert a random UUID because of FK constraint to auth.users usually.
    // But if we try, we should get a FK error, NOT a hang.
    
    const testUUID = '00000000-0000-0000-0000-000000000000'; 
    const testEmail = 'debug@test.com';

    const payload = {
        uuid: testUUID,
        email: testEmail
    };

    try {
        console.log('Attempting INSERT:', payload);
        const start = Date.now();
        const { data, error } = await supabase
            .from('user_profiles')
            .insert(payload)
            .select()
            .single();
        
        console.log(`INSERT Result (${Date.now() - start}ms):`);
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success:', data);
        }
    } catch (e) {
        console.error('Exception during INSERT:', e);
    }
}

runTest();
