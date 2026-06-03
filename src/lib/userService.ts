import { supabase } from './supabaseClient';
import type { UserProfile, UserRole, MasterWarehouse } from '../types/supabase';

export interface UserProfileDetailed extends UserProfile {
    user_roles: { id: number; role_name: string } | null;
    master_companies: { id: string; name: string } | null;
    master_warehouse: { id: string; warehouse_name: string } | null;
}

export const userService = {
    async getUsers(): Promise<UserProfileDetailed[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select(`
                uuid,
                email,
                real_name,
                user_role,
                company_id,
                wh_id,
                created_at,
                updated_at,
                user_roles (id, role_name),
                master_companies (id, name),
                master_warehouse (id, warehouse_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        // @ts-ignore
        return data as UserProfileDetailed[];
    },

    async getRoles(): Promise<UserRole[]> {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data as UserRole[];
    },

    async getWarehouses(): Promise<MasterWarehouse[]> {
        const { data, error } = await supabase
            .from('master_warehouse')
            .select('id, warehouse_name, company_id, created_at')
            .order('warehouse_name', { ascending: true });

        if (error) throw error;
        return data as MasterWarehouse[];
    },

    async updateUserProfile(uuid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('user_profiles')
            .update(profile as any)
            .eq('uuid', uuid)
            .select()
            .single();

        if (error) throw error;
        return data as UserProfile;
    }
};
