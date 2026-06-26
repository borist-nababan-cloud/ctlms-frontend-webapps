import { supabase } from './supabaseClient';
import type { InventoryCurrent } from '../types/supabase';

export const inventoryService = {

    // Get Current Stock Summary
    async getCurrentStock(companyId: string, role: number): Promise<InventoryCurrent[]> {
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

        let query = supabase
            .from('view_inventory_current')
            .select('*')
            .in('product_id', rawProductIds)
            .order('product_name');

        // Jika bukan Superuser (8) dan bukan Super Admin (1), dan companyId ada
        if (companyId && role !== 8 && role !== 1) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get Ledger History
    async getStockHistory(companyId: string, role: number): Promise<any[]> {
        let query = supabase
            .from('view_ledger_details')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Handle LIMIT 1 logic for joins (if query returns >1 record, show the last one)
        const uniqueData: any[] = [];
        const seen = new Set();
        (data || []).forEach(row => {
            // Grouping by ledger ID
            if (!seen.has(row.id)) {
                seen.add(row.id);
                uniqueData.push(row);
            }
        });

        return uniqueData;
    }
};

