import { supabase } from './supabaseClient';

export interface TcpRecord {
    id: string;
    shipment_id: string;
    product_id: string;
    tcp_value: number;
    total_in: number;
    total_out: number;
    actual_stock: number;
    current_stock_snapshot: number;
    inventory_adjustment_id: string;
    notes: string | null;
    created_at: string;
    company_id: string;
    status?: string | null;
    rejection_notes?: string | null;
    shipments?: {
        invoice_no: string;
        vessel_name: string;
        quantity: number;
    } | null;
    master_products?: {
        name: string;
        sku_code: string;
    } | null;
    inventory_adjustments?: {
        status: string;
        rejection_notes?: string | null;
    } | null;
}

export const tcpService = {
    // Fetch completed shipments for the company
    async getShipmentsForTcp(companyId: string) {
        const { data, error } = await supabase
            .from('shipments')
            .select(`
                id, 
                invoice_no, 
                vessel_name, 
                quantity, 
                product_id, 
                id_tcp,
                master_products (
                    name
                )
            `)
            .eq('company_id', companyId)
            .eq('is_completed', true)
            .order('invoice_no');
        if (error) throw error;
        return data || [];
    },

    // Fetch and aggregate ledger entries for a product
    async getLedgerTotalsForProduct(productId: string) {
        const { data, error } = await supabase
            .from('inventory_ledger')
            .select('qty_change')
            .eq('product_id', productId);
        if (error) throw error;
        
        let totalIn = 0;
        let totalOut = 0;
        
        (data || []).forEach(item => {
            const val = Number(item.qty_change) || 0;
            if (val > 0) {
                totalIn += val;
            } else if (val < 0) {
                totalOut += Math.abs(val);
            }
        });
        
        return { totalIn, totalOut };
    },

    // Get current stock for product
    async getCurrentStockForProduct(productId: string): Promise<number> {
        const { data, error } = await supabase
            .from('view_inventory_current')
            .select('current_stock_kg')
            .eq('product_id', productId)
            .maybeSingle();
        if (error) throw error;
        return data ? Number(data.current_stock_kg) || 0 : 0;
    },

    // Get TCP Input records
    async getTcpRecords(companyId: string): Promise<TcpRecord[]> {
        const { data, error } = await supabase
            .from('tcp_input')
            .select(`
                *,
                shipments:shipments!shipment_id (
                    invoice_no,
                    vessel_name,
                    quantity
                ),
                master_products (
                    name,
                    sku_code
                ),
                inventory_adjustments (
                    status,
                    rejection_notes
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as TcpRecord[];
    },

    // Save transaction
    async createTcpRecord(payload: {
        company_id: string;
        shipment_id: string;
        product_id: string;
        tcp_value: number;
        total_in: number;
        total_out: number;
        actual_stock: number;
        current_stock_snapshot: number;
        notes: string;
    }) {
        // 1. Insert to inventory_adjustments
        const { data: adjData, error: adjError } = await supabase
            .from('inventory_adjustments')
            .insert({
                company_id: payload.company_id,
                product_id: payload.product_id,
                current_stock_snapshot: payload.current_stock_snapshot,
                actual_stock: payload.actual_stock,
                status: 'ON_REQUEST',
                notes: payload.notes
            })
            .select('id')
            .single();
        if (adjError) throw adjError;

        // 2. Insert to tcp_input
        const { data: tcpData, error: tcpError } = await supabase
            .from('tcp_input')
            .insert({
                company_id: payload.company_id,
                shipment_id: payload.shipment_id,
                product_id: payload.product_id,
                tcp_value: payload.tcp_value,
                total_in: payload.total_in,
                total_out: payload.total_out,
                actual_stock: payload.actual_stock,
                current_stock_snapshot: payload.current_stock_snapshot,
                inventory_adjustment_id: adjData.id,
                notes: payload.notes
            })
            .select('id')
            .single();
        if (tcpError) {
            // Rollback adjustment request if creation fails
            await supabase.from('inventory_adjustments').delete().eq('id', adjData.id);
            throw tcpError;
        }

        // 3. Update shipments.id_tcp
        const { error: shipmentError } = await supabase
            .from('shipments')
            .update({ id_tcp: tcpData.id })
            .eq('id', payload.shipment_id);
        if (shipmentError) {
            // Rollback both
            await supabase.from('tcp_input').delete().eq('id', tcpData.id);
            await supabase.from('inventory_adjustments').delete().eq('id', adjData.id);
            throw shipmentError;
        }

        return tcpData;
    },

    // Update transaction (only if status in inventory_adjustments is not APPROVED)
    async updateTcpRecord(payload: {
        id: string;
        inventory_adjustment_id: string;
        tcp_value: number;
        actual_stock: number;
        notes: string;
    }) {
        // 1. Update inventory_adjustments
        const { error: adjError } = await supabase
            .from('inventory_adjustments')
            .update({
                actual_stock: payload.actual_stock,
                notes: payload.notes
            })
            .eq('id', payload.inventory_adjustment_id);
        if (adjError) throw adjError;

        // 2. Update tcp_input
        const { error: tcpError } = await supabase
            .from('tcp_input')
            .update({
                tcp_value: payload.tcp_value,
                actual_stock: payload.actual_stock,
                notes: payload.notes
            })
            .eq('id', payload.id);
        if (tcpError) throw tcpError;
    },

    // Approve TCP Adjustment request (RPC)
    async approveTcpAdjustment(adjustmentId: string) {
        const { error } = await supabase.rpc('approve_inventory_adjustment', {
            p_adjustment_id: adjustmentId
        });
        if (error) throw error;
    },

    // Reject TCP Adjustment request
    async rejectTcpAdjustment(adjustmentId: string, notes: string, approvedBy: string) {
        const { error } = await supabase
            .from('inventory_adjustments')
            .update({
                status: 'REJECTED',
                rejection_notes: notes,
                approved_by: approvedBy
            })
            .eq('id', adjustmentId);
        if (error) throw error;
    },

    // Resubmit TCP record
    async resubmitTcpRecord(adjustmentId: string) {
        const { error } = await supabase
            .from('inventory_adjustments')
            .update({
                status: 'ON_REQUEST',
                rejection_notes: null
            })
            .eq('id', adjustmentId);
        if (error) throw error;
    }
};
