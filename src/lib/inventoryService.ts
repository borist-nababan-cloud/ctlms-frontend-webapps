import { supabase } from './supabaseClient';
import type { InventoryCurrent } from '../types/supabase';

export const inventoryService = {

    // Get Current Stock Summary
    async getCurrentStock(): Promise<InventoryCurrent[]> {
        // Fetch only master_products with type = "INTERNAL_RAW"
        const { data: rawProducts, error: prodError } = await supabase
            .from('master_products')
            .select('id')
            .eq('type', 'INTERNAL_RAW');

        if (prodError) throw prodError;

        const rawProductIds = rawProducts?.map(p => p.id) || [];
        if (rawProductIds.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('view_inventory_current')
            .select('*')
            .in('product_id', rawProductIds)
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
                master_products!inner (
                    name,
                    sku_code,
                    type
                )
            `)
            .eq('master_products.type', 'INTERNAL_RAW')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};

