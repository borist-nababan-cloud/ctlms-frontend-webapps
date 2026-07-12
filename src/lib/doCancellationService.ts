import { supabase } from './supabaseClient';
import type { DoCancellationRequest, DoCancellationRequestDetailed } from '../types/supabase';

export const doCancellationService = {
    getDeliveryOrders: async (companyId?: string | null) => {
        let query = supabase
            .from('delivery_orders')
            .select(`
                id, 
                sj_number, 
                created_at, 
                transporter_id, 
                net_weight, 
                sales_orders (
                    po_number,
                    customer:master_partners ( name )
                )
            `)
            .order('created_at', { ascending: false });

        if (companyId) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query.limit(500); // limit to recent DOs for performance
        if (error) throw error;
        
        return (data || []).map((row: any) => ({
            ...row,
            customer_name: row.sales_orders?.customer?.name || '-',
            po_number: row.sales_orders?.po_number || '-'
        }));
    },

    getRequests: async (companyId?: string | null): Promise<DoCancellationRequestDetailed[]> => {
        let query = supabase
            .from('do_cancellation_requests')
            .select(`
                *,
                delivery_orders ( 
                    sj_number,
                    sales_orders ( po_number )
                ),
                requester:user_profiles!fk_cancellation_created_by ( real_name )
            `)
            .order('created_at', { ascending: false });

        if (companyId) {
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch sales orders for Ganti Sales Order requests manually because there's no FK constraint
        const soIds = (data || [])
            .map((row: any) => row.sales_order_id)
            .filter((id: string, index: number, self: string[]) => id && self.indexOf(id) === index);
            
        const newSos: Record<string, { order_no: string, po_number: string }> = {};
        if (soIds.length > 0) {
            const { data: soData, error: soError } = await supabase
                .from('sales_orders')
                .select('id, order_no, po_number')
                .in('id', soIds);
                
            if (!soError && soData) {
                soData.forEach(so => {
                    newSos[so.id] = so;
                });
            }
        }

        // Note: we can expand the select query above to fetch new_transporter_name etc if needed.
        // For now we map what we have.
        return (data || []).map((row: any) => ({
            ...row,
            delivery_order_no: row.delivery_orders?.sj_number,
            po_number: row.delivery_orders?.sales_orders?.po_number || '-',
            new_so_number: row.sales_order_id ? newSos[row.sales_order_id]?.order_no : undefined,
            new_po_number: row.sales_order_id ? newSos[row.sales_order_id]?.po_number : undefined,
            requester_name: row.requester?.real_name || '-'
        }));
    },

    createRequest: async (payload: Omit<DoCancellationRequest, 'id' | 'created_at'>): Promise<DoCancellationRequest> => {

        const { data, error } = await supabase
            .from('do_cancellation_requests')
            .insert([{
                ...payload,
                status: 'ON_REQUEST'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateRequestStatus: async (id: string, status: 'APPROVED' | 'REJECTED', approvedBy: string): Promise<any> => {
        if (status === 'APPROVED') {
            const { data, error } = await supabase.rpc('approve_do_cancellation', { p_request_id: id });
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('do_cancellation_requests')
                .update({ 
                    status, 
                    approved_by: approvedBy
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }
};
