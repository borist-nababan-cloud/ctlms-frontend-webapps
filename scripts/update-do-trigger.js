import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54900/postgres';

const client = new Client({
  connectionString,
});

async function updateTrigger() {
  await client.connect();
  console.log('Connected to DB');

  try {
     console.log('Updating handle_do_inventory_detail function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_do_inventory_detail()
      RETURNS TRIGGER AS $$
      DECLARE
        v_company_id uuid;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          SELECT company_id INTO v_company_id FROM public.delivery_orders WHERE id = NEW.do_id;
          INSERT INTO public.inventory_ledger (
            id,
            product_id,
            location,
            qty_change,
            transaction_type,
            reference_id,
            company_id,
            notes
          ) VALUES (
            NEW.id,
            NEW.internal_product_id,
            'STOCKPILE',
            -NEW.net_weight,
            'SALES_OUT',
            NEW.do_id,
            v_company_id,
            'DO Item Truck ' || NEW.truck_plate
          );
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          SELECT company_id INTO v_company_id FROM public.delivery_orders WHERE id = NEW.do_id;
          INSERT INTO public.inventory_ledger (
            id,
            product_id,
            location,
            qty_change,
            transaction_type,
            reference_id,
            company_id,
            notes
          ) VALUES (
            NEW.id,
            NEW.internal_product_id,
            'STOCKPILE',
            -NEW.net_weight,
            'SALES_OUT',
            NEW.do_id,
            v_company_id,
            'DO Item Truck ' || NEW.truck_plate
          )
          ON CONFLICT (id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            qty_change = EXCLUDED.qty_change,
            company_id = EXCLUDED.company_id,
            notes = EXCLUDED.notes;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          DELETE FROM public.inventory_ledger WHERE id = OLD.id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('Function updated.');

    console.log('Recreating trigger trg_do_inventory_detail...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_do_inventory_detail ON public.delivery_order_items;
      CREATE TRIGGER trg_do_inventory_detail
      AFTER INSERT OR UPDATE OR DELETE ON public.delivery_order_items
      FOR EACH ROW EXECUTE FUNCTION public.handle_do_inventory_detail();
    `);
    console.log('Trigger updated successfully.');

  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.end();
  }
}

updateTrigger();
