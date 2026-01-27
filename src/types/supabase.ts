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

export interface Shipment {
    id: string; // uuid
    reference_no: string;
    supplier_id: string; // foreign key to master_partners
    product_id: string; // foreign key to master_products
    vessel_name: string;
    origin_location: string;
    draft_survey_qty: number;
    status: 'planned' | 'loading' | 'sailing' | 'discharging' | 'completed';
    eta: string; // date
    created_at?: string;
    created_by?: string;
}

export interface ShipmentDetailed extends Shipment {
    supplier_name: string;
    product_name: string;
    sku_code: string;
    origin_jetty?: string; // from view alias
}

export interface TruckingLog {
    id: string; // uuid
    shipment_id: string; // fk to shipments
    truck_plate: string;
    ticket_number: string;
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    photo_url: string | null;
    created_at?: string;
    created_by?: string;
}

export interface InventoryLedger {
    id: string; // uuid
    product_id: string;
    transaction_type: 'TALLY_IN' | 'SALES_OUT' | 'ADJUSTMENT';
    qty_change: number;
    reference_id: string | null;
    notes: string | null;
    created_at?: string;
    created_by?: string;
}

export interface InventoryCurrent {
    product_id: string;
    sku_code: string;
    product_name: string;
    current_stock_kg: number;
}

export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: UserProfile;
                Insert: Omit<UserProfile, 'uuid' | 'created_at' | 'updated_at'>;
                Update: Partial<UserProfile>;
            };
            user_roles: {
                Row: UserRole;
                Insert: Omit<UserRole, 'id' | 'created_at'>;
                Update: Partial<UserRole>;
            };
            master_partners: {
                Row: MasterPartner;
                Insert: Omit<MasterPartner, 'id' | 'created_at'>;
                Update: Partial<MasterPartner>;
            };
            master_products: {
                Row: MasterProduct;
                Insert: Omit<MasterProduct, 'id' | 'created_at'>;
                Update: Partial<MasterProduct>;
            };
            shipments: {
                Row: Shipment;
                Insert: Omit<Shipment, 'id' | 'created_at'>;
                Update: Partial<Shipment>;
            };
            trucking_logs: {
                Row: TruckingLog;
                Insert: Omit<TruckingLog, 'id' | 'created_at'>;
                Update: Partial<TruckingLog>;
            };
            inventory_ledger: {
                Row: InventoryLedger;
                Insert: Omit<InventoryLedger, 'id' | 'created_at'>;
                Update: Partial<InventoryLedger>;
            };
        };
    };
}


