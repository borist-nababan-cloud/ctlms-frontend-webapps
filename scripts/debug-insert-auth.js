
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function runTest() {
    console.log('--- STARTING AUTH & INSERT DEBUG TEST ---');
    
    const email = `testuser_${Date.now()}@test.com`;
    const password = 'password123';

    console.log(`1. Signing up user: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        console.error('SignUp Error:', authError.message);
        return;
    }

    const user = authData.user;
    if (!user) {
        console.error('No user returned from signUp (maybe confirmations enabled?)');
        return;
    }
    console.log('User created:', user.id);

    const payload = {
        uuid: user.id,
        email: user.email
    };

    try {
        console.log('2. Attempting INSERT profile for user:', payload);
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
