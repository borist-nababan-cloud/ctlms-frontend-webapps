import { supabase } from './supabaseClient';
import type { SalesOrder, SalesOrderDetailed } from '../types/supabase';

export const salesService = {
    // Fetch all sales orders with details (partner name, product name/sku, company name)
    getSalesOrders: async (): Promise<SalesOrderDetailed[]> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                customer:master_partners(name),
                product:master_products(name, sku_code),
                company:master_companies(name)
            `)
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

    // Get single sales order by ID
    getSalesOrderById: async (id: string): Promise<SalesOrder | null> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Create a new sales order
    createSalesOrder: async (order: Partial<SalesOrder>): Promise<SalesOrder> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .insert(order)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update an existing sales order
    updateSalesOrder: async (id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete a sales order (subject to RLS & completed lock triggers)
    deleteSalesOrder: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('sales_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
