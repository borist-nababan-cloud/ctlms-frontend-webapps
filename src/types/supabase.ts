export interface UserRole {
    id: number;
    role_name: string;
    created_at?: string;
}

export interface UserProfile {
    uuid: string; // uuid
    email: string;
    user_role: number | null; // bigint
    wh_id: string | null; // uuid
    real_name: string | null;
    created_at?: string;
    updated_at?: string;
}


export interface MasterPartner {
    id: string; // uuid
    name: string;
    type: 'SUPPLIER' | 'CUSTOMER' | 'TRANSPORTER' | 'OTHER';
    tax_id: string | null;
    address: string | null;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    is_active: boolean | null; // Database default is true
    city: string | null;
    province: string | null;
    phone_cp: string | null;
    wa_cp: string | null;
    bank_acc: string | null;
    no_acc: string | null;
    name_acc: string | null;
    created_at?: string;
}

export interface MasterProduct {
    id: string; // uuid
    sku_code: string;
    name: string;
    type: 'INTERNAL_RAW' | 'PUBLISHED_FINISHED';
    current_price: number;
    created_at?: string;
}

export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: UserProfile;
                Insert: UserProfile;
                Update: Partial<UserProfile>;
            };
            user_roles: {
                Row: UserRole;
                Insert: UserRole;
                Update: Partial<UserRole>;
            };
            master_partners: {
                Row: MasterPartner;
                Insert: MasterPartner;
                Update: Partial<MasterPartner>;
            };
            master_products: {
                Row: MasterProduct;
                Insert: MasterProduct;
                Update: Partial<MasterProduct>;
            };
        };
    };
}

