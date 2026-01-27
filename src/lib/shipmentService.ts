import { supabase } from './supabaseClient';
import type { Shipment, ShipmentDetailed } from '../types/supabase';

export const shipmentService = {
    // Fetch all shipments (detailed view)
    getShipments: async (): Promise<ShipmentDetailed[]> => {
        const { data, error } = await supabase
            .from('view_shipments_detailed')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get single shipment by ID
    getShipmentById: async (id: string): Promise<Shipment | null> => {
        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Create new shipment
    createShipment: async (shipment: Partial<Shipment>): Promise<Shipment> => {
        const { data, error } = await supabase
            .from('shipments')
            .insert(shipment)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update existing shipment
    updateShipment: async (id: string, updates: Partial<Shipment>): Promise<Shipment> => {
        const { data, error } = await supabase
            .from('shipments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete shipment
    deleteShipment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('shipments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
