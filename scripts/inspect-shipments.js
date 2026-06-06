import pg from 'pg';

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function run() {
    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
        const query = `
            CREATE OR REPLACE VIEW public.view_shipments_detailed AS
            SELECT s.id,
                s.invoice_no,
                s.supplier_id,
                mp.name,
                mp.name AS supplier_name,
                s.product_id,
                prod.sku_code,
                prod.name AS product_name,
                s.vessel_name,
                s.asal_batu,
                s.quantity,
                s.jenis_batu,
                s.status,
                s.eta,
                s.created_at,
                s.is_completed,
                s.harga,
                s.disc,
                s.pph_tax,
                s.ppn_tax,
                s.qty_loading,
                s.issue_date,
                s.loading_date,
                s.company_id
            FROM ((shipments s
                LEFT JOIN master_partners mp ON ((s.supplier_id = mp.id)))
                LEFT JOIN master_products prod ON ((s.product_id = prod.id)));
        `;
        await client.query(query);
        console.log('view_shipments_detailed view recreated successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
