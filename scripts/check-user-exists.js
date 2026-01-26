
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser(email) {
    console.log(`Checking existence for: ${email}`);
    // Try to signUp. If user exists, it should say "User already registered" (if Confirmations enabled)
    // Or it might send a magic link.
    // Better way: Try to signIn with a dummy password. 
    // If "Invalid login credentials", user MIGHT exist (wrong pass) OR not exist (security through obscurity).
    
    // BUT we can use Admin API if we had the service_role key.
    // Lacking that, let's try signUp.
    
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'TemporaryPassword123!'
    });
    
    if (error) {
        console.log('SignUp result:', error.message);
    } else {
        console.log('SignUp result: Success (User created or email sent)', data.user?.id);
    }
}

checkUser('borist.nababan@gmail.com');
