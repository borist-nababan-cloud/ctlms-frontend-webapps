import { supabase } from './supabaseClient';
import type { TruckingLog } from '../types/supabase';

export const logisticsService = {

    // upload photo to 'tickets' bucket
    async uploadTicketPhoto(file: File, path: string): Promise<string | null> {
        try {
            const { error } = await supabase.storage
                .from('tickets')
                .upload(path, file);

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('tickets')
                .getPublicUrl(path);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error;
        }
    },

    // create log entry
    async createLog(logData: Partial<TruckingLog>): Promise<TruckingLog> {
        // Remove generated columns and system fields
        const { net_weight, id, created_at, created_by, ...payload } = logData as any;

        const { data, error } = await supabase
            .from('trucking_logs')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return data as TruckingLog;
    },

    // Get logs (supports filtering)
    async getLogs(shipmentId?: string): Promise<any[]> {
        let query = supabase
            .from('trucking_logs')
            .select(`
                *,
                shipments (
                    reference_no,
                    vessel_name
                )
            `)
            .order('created_at', { ascending: false });

        if (shipmentId) {
            query = query.eq('shipment_id', shipmentId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get daily total for a shipment (Client-side calc or DB aggregation)
    async getDailyTotal(shipmentId: string): Promise<number> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('trucking_logs')
            .select('net_weight')
            .eq('shipment_id', shipmentId)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        if (error) throw error;

        return (data || []).reduce((sum: number, record: any) => sum + (record?.net_weight || 0), 0);
    }
};
