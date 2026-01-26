import { supabase } from './supabaseClient';
import type { MasterPartner, MasterProduct } from '../types/supabase';

export const masterService = {
    // Partners
    async getPartners() {
        const { data, error } = await supabase
            .from('master_partners')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as MasterPartner[];
    },

    async createPartner(partner: Omit<MasterPartner, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('master_partners')
            .insert(partner as any)
            .select()
            .single();
        if (error) throw error;
        return data as MasterPartner;
    },

    async updatePartner(id: string, partner: Partial<MasterPartner>) {
        const { data, error } = await supabase
            .from('master_partners')
            .update(partner as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterPartner;
    },

    // Products
    async getProducts() {
        const { data, error } = await supabase
            .from('master_products')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as MasterProduct[];
    },

    async createProduct(product: Omit<MasterProduct, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('master_products')
            .insert(product as any)
            .select()
            .single();
        if (error) throw error;
        return data as MasterProduct;
    },

    async updateProduct(id: string, product: Partial<MasterProduct>) {
        const { data, error } = await supabase
            .from('master_products')
            .update(product as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterProduct;
    }
};
