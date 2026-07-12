import { supabase } from './supabaseClient';
import type { MasterPartner, MasterProduct, MasterCompany, MasterBlending, MasterTypeProduction } from '../types/supabase';

export const masterService = {
    // Partners
    async getPartners(companyId?: string | null, role?: number | null) {
        let query = supabase
            .from('master_partners')
            .select('*, company:master_companies(name)')
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            query = query.or(`company_id.eq.${companyId},company_id.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((row: any) => ({
            ...row,
            company_name: row.company?.name || '-'
        })) as MasterPartner[];
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
            // @ts-ignore
            .update(partner as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterPartner;
    },

    // Products
    async getProducts(companyId?: string | null, role?: number | null) {
        const query = supabase
            .from('master_products')
            .select('*, company:master_companies(name)')
            .order('created_at', { ascending: false });

        // Removed company_id filter entirely so all modules can fetch products globally
        // if (role !== 8 && companyId) {
        //     query = query.or(`company_id.eq.${companyId},company_id.is.null`);
        // }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((row: any) => ({
            ...row,
            company_name: row.company?.name || '-'
        })) as MasterProduct[];
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
            // @ts-ignore
            .update(product as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterProduct;
    },

    // Companies
    async getCompanies() {
        const { data, error } = await supabase
            .from('master_companies')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as MasterCompany[];
    },

    async createCompany(company: Omit<MasterCompany, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('master_companies')
            .insert(company as any)
            .select()
            .single();
        if (error) throw error;
        return data as MasterCompany;
    },

    async updateCompany(id: string, company: Partial<MasterCompany>) {
        const { data, error } = await supabase
            .from('master_companies')
            // @ts-ignore
            .update(company as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterCompany;
    },

    async getCompanyById(id: string) {
        const { data, error } = await supabase
            .from('master_companies')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data as MasterCompany;
    },

    // Blending
    async getBlendingConfigurations() {
        const { data, error } = await supabase
            .from('master_blending')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as MasterBlending[];
    },

    async createBlendingConfiguration(blending: Omit<MasterBlending, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('master_blending')
            .insert(blending as any)
            .select()
            .single();
        if (error) throw error;
        return data as MasterBlending;
    },

    async updateBlendingConfiguration(id: string, blending: Partial<MasterBlending>) {
        const { data, error } = await supabase
            .from('master_blending')
            // @ts-ignore
            .update(blending as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterBlending;
    },

    async deleteBlendingConfiguration(id: string) {
        const { error } = await supabase
            .from('master_blending')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Type Production
    async getTypeProductions() {
        const { data, error } = await supabase
            .from('master_type_production')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as MasterTypeProduction[];
    },

    async createTypeProduction(typeProduction: Omit<MasterTypeProduction, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('master_type_production')
            .insert(typeProduction as any)
            .select()
            .single();
        if (error) throw error;
        return data as MasterTypeProduction;
    },

    async updateTypeProduction(id: string, typeProduction: Partial<MasterTypeProduction>) {
        const { data, error } = await supabase
            .from('master_type_production')
            // @ts-ignore
            .update(typeProduction as any)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MasterTypeProduction;
    },

    async deleteTypeProduction(id: string) {
        const { error } = await supabase
            .from('master_type_production')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
