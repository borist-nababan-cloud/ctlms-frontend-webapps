import { supabase } from './supabaseClient';

export interface InventoryAdjustmentRecord {
    id: string;
    company_id: string;
    product_id: string;
    current_stock_snapshot: number;
    actual_stock: number;
    status: 'ON_REQUEST' | 'APPROVED' | 'REJECTED';
    notes: string | null;
    created_by: string;
    approved_by: string | null;
    created_at: string;
    product_name?: string;
    requester_name?: string;
    requester_email?: string;
}

export const inventoryAdjustmentService = {
    // Get raw products (INTERNAL_RAW only)
    async getProductsForAdjustment() {
        const { data, error } = await supabase
            .from('master_products')
            .select('id, name, sku_code')
            .eq('type', 'INTERNAL_RAW')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    // Get current stock for product from view_inventory_current
    async getCurrentStockForProduct(productId: string): Promise<number> {
        const { data, error } = await supabase
            .from('view_inventory_current')
            .select('current_stock_kg')
            .eq('product_id', productId)
            .maybeSingle();
        if (error) throw error;
        return data ? Number(data.current_stock_kg) || 0 : 0;
    },

    // Submit adjustment request
    async submitAdjustmentRequest(payload: {
        company_id: string;
        product_id: string;
        current_stock_snapshot: number;
        actual_stock: number;
        notes: string;
    }) {
        const { data, error } = await supabase
            .from('inventory_adjustments')
            .insert({
                company_id: payload.company_id,
                product_id: payload.product_id,
                current_stock_snapshot: payload.current_stock_snapshot,
                actual_stock: payload.actual_stock,
                status: 'ON_REQUEST',
                notes: payload.notes
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Get pending adjustments (ON_REQUEST status)
    async getPendingAdjustments(): Promise<InventoryAdjustmentRecord[]> {
        const { data, error } = await supabase
            .from('inventory_adjustments')
            .select(`
                *,
                master_products (
                    name
                ),
                user_profiles!created_by (
                    real_name,
                    email
                )
            `)
            .eq('status', 'ON_REQUEST')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map product and requester info inline
        const mapped = (data || []).map((item: any) => {
            const rawProfile = item.user_profiles;
            const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
            return {
                ...item,
                created_at: item.created_at, // Explicitly assign to prevent prototype/getter stripping
                product_name: item.master_products?.name || '-',
                requester_name: profile?.real_name || profile?.email || '-',
                requester_email: profile?.email || '-'
            };
        });
        return mapped;
    },

    // Approve inventory adjustment (RPC)
    async approveAdjustment(adjustmentId: string) {
        const { error } = await supabase.rpc('approve_inventory_adjustment', {
            p_adjustment_id: adjustmentId
        });
        if (error) throw error;
    },

    // Reject inventory adjustment (update status to REJECTED)
    async rejectAdjustment(adjustmentId: string, approvedBy: string) {
        const { error } = await supabase
            .from('inventory_adjustments')
            .update({
                status: 'REJECTED',
                approved_by: approvedBy
            })
            .eq('id', adjustmentId);
        if (error) throw error;
    }
};
