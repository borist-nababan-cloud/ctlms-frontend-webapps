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
    async getProductsForAdjustment(companyId?: string) {
        let query = supabase
            .from('master_products')
            .select('id, name, sku_code')
            .eq('type', 'INTERNAL_RAW')
            .order('name');
            
        if (companyId) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get current stock for product from view_inventory_current
    async getCurrentStockForProduct(productId: string, companyId?: string): Promise<number> {
        let query = supabase
            .from('view_inventory_current')
            .select('current_stock_kg')
            .eq('product_id', productId);
            
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
            
        const { data, error } = await query.maybeSingle();
        if (error) {
            console.error('Error getting current stock:', error);
            return 0;
        }
        return data ? Number(data.current_stock_kg) || 0 : 0;
    },

    // Submit adjustment request
    async submitAdjustmentRequest(payload: {
        company_id: string;
        product_id: string;
        shipment_id: string;
        current_stock_snapshot: number;
        actual_stock: number;
        notes: string;
        created_by: string;
    }) {
        const { data, error } = await supabase
            .from('inventory_adjustments')
            .insert({
                company_id: payload.company_id,
                product_id: payload.product_id,
                shipment_id: payload.shipment_id,
                current_stock_snapshot: payload.current_stock_snapshot,
                actual_stock: payload.actual_stock,
                selisih: payload.actual_stock - payload.current_stock_snapshot,
                status: 'ON_REQUEST',
                notes: payload.notes,
                created_by: payload.created_by
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Get pending adjustments (ON_REQUEST status)
    async getPendingAdjustments(): Promise<any[]> {
        const { data, error } = await supabase
            .from('view_adjustment_report')
            .select('*')
            .eq('status', 'ON_REQUEST')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return data || [];
    },

    // Approve inventory adjustment (Direct update status = 'APPROVED')
    async approveAdjustment(adjustmentId: string, approvedBy: string) {
        const { error } = await supabase
            .from('inventory_adjustments')
            .update({
                status: 'APPROVED',
                approved_by: approvedBy
            })
            .eq('id', adjustmentId);
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
