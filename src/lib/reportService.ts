import { supabase } from './supabaseClient';

export interface DateFilter {
    startDate?: string;
    endDate?: string;
}

export const reportService = {
    // 1. Stock Movement (Chart)
    async getStockMovement(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('inventory_ledger')
            .select(`
                id,
                qty_change,
                created_at,
                master_products!inner(name, sku_code, type)
            `)
            .eq('master_products.type', 'INTERNAL_RAW')
            .order('created_at', { ascending: true });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }

        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getStockMovement] Supabase error:', error);
            throw error;
        }

        

        // Process data to cumulative sum for recharts
        let cumulativeStock = 0;
        const chartData = (data || []).map(item => {
            cumulativeStock += Number(item.qty_change || 0);
            return {
                date: new Date(item.created_at).toLocaleDateString('id-ID'),
                stock: cumulativeStock,
                rawDate: item.created_at
            };
        });

        // Group by date to avoid massive unreadable charts (take last entry of the day)
        const groupedData: Record<string, any> = {};
        chartData.forEach(item => {
            groupedData[item.date] = item; // Overwrites, leaving the latest stock of that day
        });

        const finalData = Object.values(groupedData).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
        
        return finalData;
    },

    // 2. Current Stock (Table)
    async getCurrentStock(companyId: string, role: number) {
        
        let query = supabase
            .from('view_inventory_current')
            .select('*')
            .order('product_name', { ascending: true });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getCurrentStock] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 3. Pembelian (Shipments)
    async getPembelian(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('shipments')
            .select(`
                id,
                invoice_no,
                vessel_name,
                quantity,
                created_at,
                status,
                master_partners(name),
                master_products(name)
            `)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getPembelian] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 4. Penjualan (Sales Orders)
    async getPenjualan(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('sales_orders')
            .select(`
                id,
                order_no,
                qty_ordered,
                status,
                created_at,
                master_partners(name),
                master_products(name)
            `)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getPenjualan] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 5. Pengiriman (Delivery Orders)
    async getPengiriman(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('delivery_orders')
            .select(`
                id,
                sj_number,
                delivery_type,
                net_weight,
                created_at,
                sales_orders(order_no, status, master_partners(name))
            `)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getPengiriman] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 6. TCP Input
    async getTcp(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('tcp_input')
            .select(`
                id,
                tcp_value,
                total_in,
                total_out,
                actual_stock,
                current_stock_snapshot,
                created_at,
                shipments:shipments!shipment_id(invoice_no, vessel_name, quantity),
                master_products(name)
            `)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getTcp] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 7. Inventory Adjustments
    async getAdjustments(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('inventory_adjustments')
            .select(`
                id,
                actual_stock,
                current_stock_snapshot,
                status,
                notes,
                created_at,
                master_products(name)
            `)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getAdjustments] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    }
};
