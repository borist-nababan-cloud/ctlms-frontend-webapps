import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const SUPABASE_URL = 'http://127.0.0.1:54910';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54900/postgres';

async function seed() {
    const email = 'admin@admin.com';
    const password = 'adminpassword';
    console.log(`Starting seed process for ${email}...`);

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        console.error('Sign Up Error:', authError.message);
        if (!authError.message.includes('already registered')) {
            return;
        }
    }

    let uuid = authData?.user?.id;

    const pgClient = new pg.Client({ connectionString });
    await pgClient.connect();

    try {
        // 0. Seed user roles if empty
        console.log('Checking and seeding user roles...');
        await pgClient.query(`
            INSERT INTO public.user_roles (id, role_name, created_at)
            VALUES 
                (1, 'Super Administrator', NOW()),
                (2, 'Pembelian', NOW()),
                (3, 'Penjualan', NOW()),
                (4, 'Supervisor', NOW()),
                (5, 'Staff', NOW()),
                (6, 'Operator', NOW()),
                (7, 'Unassigned', NOW()),
                (8, 'Super User', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        // If sign up returned already registered, find the UUID in DB
        if (!uuid) {
            const res = await pgClient.query('SELECT id FROM auth.users WHERE email = $1', [email]);
            if (res.rows.length > 0) {
                uuid = res.rows[0].id;
                console.log(`Found existing user with UUID: ${uuid}`);
            } else {
                console.error('Could not find existing user UUID');
                return;
            }
        } else {
            console.log(`User created in auth.users with UUID: ${uuid}`);
        }

        // 2. Seed some master companies so UserManagement edit dialog has selections
        console.log('Seeding Master Companies...');
        await pgClient.query(`
            INSERT INTO public.master_companies (id, name, created_at)
            VALUES 
                ('c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Niaga Sejahtera Makmur', NOW()),
                ('c2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Nababan Cloud Indonesia', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        // 3. Seed some master warehouses
        console.log('Seeding Master Warehouses...');
        await pgClient.query(`
            INSERT INTO public.master_warehouse (id, warehouse_name, company_id, created_at)
            VALUES 
                ('b1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Gudang Utama NSM Jakarta', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW()),
                ('b2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Gudang Penumpukan Balikpapan', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW()),
                ('b3d9b3e3-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Stockpile Nababan Surabaya', 'c2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        // 4. Create/promote the user profile to Super User (role_id = 8)
        console.log(`Inserting/promoting profile for ${email} with user_role = 8...`);
        await pgClient.query(`
            INSERT INTO public.user_profiles (uuid, email, user_role, real_name, company_id, created_at, updated_at)
            VALUES ($1, $2, 8, 'Super Admin User', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW(), NOW())
            ON CONFLICT (uuid) DO UPDATE SET user_role = 8, real_name = 'Super Admin User';
        `, [uuid, email]);

        console.log('Seed completed successfully!');
        console.log(`You can now log in using:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        await pgClient.end();
    }
}

seed();
