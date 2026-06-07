import { supabase } from './supabaseClient';
import type { DeliveryOrder, SalesOrderDetailed, Shipment, MasterProduct } from '../types/supabase';

export const deliveryService = {
    getActiveSalesOrders: async (): Promise<SalesOrderDetailed[]> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                customer:master_partners(name),
                product:master_products(name, sku_code),
                company:master_companies(name)
            `)
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((so: any) => ({
            ...so,
            customer_name: so.customer?.name || '-',
            product_name: so.product_name || so.product?.name || '-',
            sku_code: so.product?.sku_code || '-',
            company_name: so.company?.name || '-'
        }));
    },

    getInternalProducts: async (): Promise<MasterProduct[]> => {
        const { data, error } = await supabase
            .from('master_products')
            .select('*')
            .eq('type', 'INTERNAL_RAW')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    getShipmentsByProduct: async (productId: string): Promise<Shipment[]> => {
        // Fetch all shipments regardless of is_completed or completed status
        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    generateSjNumber: async (companyId: string): Promise<string> => {
        const { data, error } = await supabase.rpc('generate_sj_number', { p_company_id: companyId });
        if (error) throw error;
        return data;
    },

    createDeliveryOrder: async (deliveryOrder: Partial<DeliveryOrder>): Promise<DeliveryOrder> => {
        const { data, error } = await supabase
            .from('delivery_orders')
            .insert(deliveryOrder)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateDeliveryOrder: async (id: string, deliveryOrder: Partial<DeliveryOrder>): Promise<DeliveryOrder> => {
        const { data, error } = await supabase
            .from('delivery_orders')
            .update(deliveryOrder)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    getDeliveryOrdersDetailed: async (): Promise<any[]> => {
        const { data, error } = await supabase
            .from('delivery_orders')
            .select(`
                *,
                sales_order:sales_orders (
                    order_no,
                    customer:master_partners (name),
                    product:master_products (name)
                ),
                shipment:shipments (
                    vessel_name,
                    invoice_no,
                    product_id
                ),
                company:master_companies (
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((doItem: any) => ({
            ...doItem,
            so_number: doItem.sales_order?.order_no || '-',
            customer_name: doItem.sales_order?.customer?.name || '-',
            product_name: doItem.published_product_name || doItem.sales_order?.product?.name || '-',
            company_name: doItem.company?.name || '-',
            vessel_display: doItem.vessel_name || (doItem.shipment ? `${doItem.shipment.vessel_name} - ${doItem.shipment.invoice_no}` : '-')
        }));
    }
};
