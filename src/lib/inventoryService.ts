import { supabase } from './supabaseClient';
import type { InventoryCurrent } from '../types/supabase';

export const inventoryService = {

    // Get Current Stock Summary
    async getCurrentStock(): Promise<InventoryCurrent[]> {
        const { data, error } = await supabase
            .from('view_inventory_current')
            .select('*')
            .order('product_name');

        if (error) throw error;
        return data || [];
    },

    // Get Ledger History
    async getStockHistory(): Promise<any[]> {
        const { data, error } = await supabase
            .from('inventory_ledger')
            .select(`
                *,
                master_products (
                    name,
                    sku_code
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};
