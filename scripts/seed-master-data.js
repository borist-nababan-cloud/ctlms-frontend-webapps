import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const SUPABASE_URL = 'http://127.0.0.1:54910';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ3NjYyMTZ9.6WTOjI0A1WWCSVJzGoumQdd5-RtI_PduZOk8Nnu2kPhy98jRywEL0YzfoBEGWrfnnYheV1SqCpd2YcRhhyFW6g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54900/postgres';

async function seedMasterData() {
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'adminpassword';
    console.log('--- STARTING COMPREHENSIVE MASTER DATA SEEDING ---');

    // 1. Sign up/ensure admin user in Supabase Auth
    console.log(`Checking/creating Supabase Auth user: ${adminEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword
    });

    if (authError) {
        console.log('Supabase Auth Sign Up Notice:', authError.message);
    }

    const pgClient = new pg.Client({ connectionString });
    await pgClient.connect();

    try {
        // 2. Seed User Roles
        console.log('Seeding User Roles...');
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

        // Get admin user UUID
        let adminUuid = authData?.user?.id;
        if (!adminUuid) {
            const res = await pgClient.query('SELECT id FROM auth.users WHERE email = $1', [adminEmail]);
            if (res.rows.length > 0) {
                adminUuid = res.rows[0].id;
                console.log(`Found existing admin user UUID: ${adminUuid}`);
            } else {
                console.error('Could not find admin user UUID');
                return;
            }
        } else {
            console.log(`Admin user created/verified with UUID: ${adminUuid}`);
        }

        // 3. Seed Master Companies
        console.log('Seeding Master Companies...');
        await pgClient.query(`
            INSERT INTO public.master_companies (id, name, hex_color, created_at)
            VALUES 
                ('c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Niaga Sejahtera Makmur', '#6366f1', NOW()),
                ('c2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Nababan Cloud Indonesia', '#ec4899', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        // 4. Seed Master Warehouses
        console.log('Seeding Master Warehouses...');
        await pgClient.query(`
            INSERT INTO public.master_warehouse (id, warehouse_name, company_id, created_at)
            VALUES 
                ('b1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Gudang Utama NSM Jakarta', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW()),
                ('b2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Gudang Penumpukan Balikpapan', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW()),
                ('b3d9b3e3-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'Stockpile Nababan Surabaya', 'c2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        // 5. Seed Admin User Profile
        console.log(`Inserting/promoting profile for ${adminEmail} to Super User (role = 8)...`);
        await pgClient.query(`
            INSERT INTO public.user_profiles (uuid, email, user_role, real_name, company_id, wh_id, created_at, updated_at)
            VALUES ($1, $2, 8, 'Super Admin User', 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'b1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', NOW(), NOW())
            ON CONFLICT (uuid) DO UPDATE SET user_role = 8, real_name = 'Super Admin User', company_id = 'c1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', wh_id = 'b1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f';
        `, [adminUuid, adminEmail]);

        // 6. Seed Master Products
        console.log('Seeding Master Products (INTERNAL_RAW and PUBLISHED_FINISHED)...');
        await pgClient.query(`
            INSERT INTO public.master_products (id, sku_code, name, type, description, current_price, unit, created_at)
            VALUES 
                ('d1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'RAW-3800', 'Batu Bara GAR 3800', 'INTERNAL_RAW', 'Batu Bara Mentah Kalori 3800 kcal/kg', 650000, 'MT', NOW()),
                ('d2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'RAW-4200', 'Batu Bara GAR 4200', 'INTERNAL_RAW', 'Batu Bara Mentah Kalori 4200 kcal/kg', 750000, 'MT', NOW()),
                ('d3d9b3e3-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'RAW-5000', 'Batu Bara GAR 5000', 'INTERNAL_RAW', 'Batu Bara Mentah Kalori 5000 kcal/kg', 950000, 'MT', NOW()),
                ('d4d9b3e4-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'FIN-PREM', 'Batu Bara Premium Blended', 'PUBLISHED_FINISHED', 'Batu Bara Olahan Siap Jual Premium', 1200000, 'MT', NOW()),
                ('d5d9b3e5-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'FIN-COAL-A', 'Batu Bara Siap Jual Kategori A', 'PUBLISHED_FINISHED', 'Batu Bara Olahan Siap Jual Grade A', 1100000, 'MT', NOW())
            ON CONFLICT (sku_code) DO NOTHING;
        `);

        // 7. Seed Master Partners
        console.log('Seeding Master Partners (SUPPLIER, CUSTOMER, TRANSPORTER)...');
        await pgClient.query(`
            INSERT INTO public.master_partners (id, name, type, tax_id, address, contact_person, email, phone, is_active, city, province, created_at)
            VALUES 
                ('e1d9b3e1-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Tambang Makmur Sejahtera', 'SUPPLIER', '01.234.567.8-901.000', 'Kawasan Tambang Coal Sektor 4', 'Ir. Bambang Wijaya', 'contact@tambangmakmur.co.id', '021-5551234', true, 'Samarinda', 'Kalimantan Timur', NOW()),
                ('e2d9b3e2-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Sumber Energi Prima', 'SUPPLIER', '01.234.567.8-902.000', 'Jl. Jenderal Sudirman No. 45', 'Siti Rahmawati', 'info@sumberenergiprima.com', '021-5555678', true, 'Balikpapan', 'Kalimantan Timur', NOW()),
                ('e3d9b3e3-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT PLN Indonesia Power', 'CUSTOMER', '01.234.567.8-903.000', 'Jl. Gatot Subroto Kav. 18', 'Budi Santoso', 'procurement@pln-ip.co.id', '021-5559876', true, 'Jakarta Selatan', 'DKI Jakarta', NOW()),
                ('e4d9b3e4-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Semen Sentosa Tbk', 'CUSTOMER', '01.234.567.8-904.000', 'Kawasan Industri Gresik Blok B', 'Hendra Wijaya', 'purchasing@semensentosa.co.id', '031-5553322', true, 'Gresik', 'Jawa Timur', NOW()),
                ('e5d9b3e5-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Lintas Logistik Nusantara', 'TRANSPORTER', '01.234.567.8-905.000', 'Kawasan Pelabuhan Semayang No. 12', 'Agus Prayogo', 'ops@lintaslogistik.com', '0542-5554433', true, 'Balikpapan', 'Kalimantan Timur', NOW()),
                ('e6d9b3e6-2a3b-4c5d-6e7f-8a9b0c1d2e3f', 'PT Angkutan Jaya Utama', 'TRANSPORTER', '01.234.567.8-906.000', 'Jl. Yos Sudarso No. 89', 'Dewi Lestari', 'info@angkutanjaya.co.id', '0541-5557766', true, 'Samarinda', 'Kalimantan Timur', NOW())
            ON CONFLICT (id) DO NOTHING;
        `);

        console.log('--- COMPREHENSIVE SEED COMPLETED SUCCESSFULLY! ---');
        console.log('Admin login details:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`User Role: Super User (8)`);

    } catch (err) {
        console.error('Error seeding master data:', err);
    } finally {
        await pgClient.end();
    }
}

seedMasterData();
