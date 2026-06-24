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
    company_id: string | null; // uuid
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
    company_id: string | null;
}

export interface MasterProduct {
    id: string; // uuid
    sku_code: string;
    name: string;
    type: 'INTERNAL_RAW' | 'PUBLISHED_FINISHED';
    current_price: number;
    created_at?: string;
    company_id: string | null;
}

export interface MasterCompany {
    id: string; // uuid
    name: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zipcode?: string | null;
    pic_name?: string | null;
    fixline?: string | null;
    mobile?: string | null;
    email?: string | null;
    logo_url?: string | null;
    created_at?: string;
}

export interface MasterWarehouse {
    id: string; // uuid
    warehouse_name: string;
    company_id?: string | null;
    created_at?: string;
}

export interface MasterBlending {
    id: string; // uuid
    company_id?: string | null; // uuid
    nama_blending: string;
    cost: number;
    created_at?: string;
}

export interface MasterTypeProduction {
    id: string; // uuid
    company_id?: string | null; // uuid
    nama_type: string;
    cost: number;
    created_at?: string;
}


export interface Shipment {
    id: string; // uuid
    invoice_no: string;
    supplier_id: string; // foreign key to master_partners
    product_id: string; // foreign key to master_products
    vessel_name: string;
    asal_batu: string;
    quantity: number;
    jenis_batu?: 'High' | 'Medium' | 'Low' | null;
    status: 'planned' | 'loading' | 'sailing' | 'discharging' | 'completed';
    eta: string; // date
    created_at?: string;
    created_by?: string;
    company_id?: string | null;
    disc?: number;
    harga?: number;
    is_completed?: boolean;
    issue_date?: string | null;
    loading_date?: string | null;
    pph_tax?: number;
    ppn_tax?: number;
    qty_loading?: number | null;
}

export interface ShipmentDetailed extends Shipment {
    supplier_name: string;
    product_name: string;
    sku_code: string;
    company_name?: string | null;
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

export interface SalesOrder {
    id: string; // uuid
    created_at?: string;
    order_no: string;
    customer_id: string; // uuid -> master_partners
    product_id: string; // uuid -> master_products
    product_name?: string | null;
    qty_ordered: number;
    price_per_kg: number;
    delivery_type?: 'DIRECT_BARGE' | 'STOCKPILE' | 'SCHEDULED' | null;
    status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    delivery_date?: string | null;
    notes?: string | null;
    created_by?: string | null;
    company_id?: string | null; // uuid -> master_companies
    is_completed: boolean;
}

export interface SalesOrderDetailed extends SalesOrder {
    customer_name?: string;
    customer_address?: string;
    product_name?: string;
    company_name?: string | null;
    sku_code?: string;
}

export interface DeliveryOrder {
    id: string; // uuid
    created_at?: string;
    sales_order_id: string; // uuid -> sales_orders
    truck_plate: string | null;
    ticket_number: string | null;
    net_weight: number;
    photo_url: string | null;
    created_by?: string | null;
    company_id?: string | null; // uuid -> master_companies
    date_of_issue?: string;
    gross_terima?: number;
    gross_weight?: number;
    net_terima?: number;
    shipment_id?: string | null; // uuid -> shipments
    sj_number?: string | null;
    tare_terima?: number;
    tare_weight?: number;
    vessel_name?: string | null;
    published_product_name?: string | null;
    internal_product_id?: string | null;
    delivery_type?: 'DIRECT' | 'STOCKPILE' | null;
    type_blending?: 'NONE' | 'BLENDING TUMPUK' | 'BLENDING BAWAH' | null;
    transporter_id?: string | null;
    adjust_weight?: number | null;
}

export interface DeliveryOrderItem {
    id: string; // uuid
    created_at?: string;
    do_id: string | null; // uuid
    internal_product_id: string | null; // uuid
    type_production_id: string | null; // uuid
    blending_id: string | null; // uuid
    truck_plate: string | null;
    ticket_number?: string | null;
    gross_weight: number | null;
    tare_weight: number | null;
    net_weight: number | null;
    photo_url: string | null;
    shipment_id: string | null; // uuid -> shipments
    vessel_name: string | null;
    produk_net?: number | null;
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
            master_companies: {
                Row: MasterCompany;
                Insert: Omit<MasterCompany, 'id' | 'created_at'>;
                Update: Partial<MasterCompany>;
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
            sales_orders: {
                Row: SalesOrder;
                Insert: Omit<SalesOrder, 'id' | 'created_at'>;
                Update: Partial<SalesOrder>;
            };
            delivery_orders: {
                Row: DeliveryOrder;
                Insert: Omit<DeliveryOrder, 'id' | 'created_at'>;
                Update: Partial<DeliveryOrder>;
            };
            delivery_order_items: {
                Row: DeliveryOrderItem;
                Insert: Omit<DeliveryOrderItem, 'id' | 'created_at'>;
                Update: Partial<DeliveryOrderItem>;
            };
        };
    };
}


