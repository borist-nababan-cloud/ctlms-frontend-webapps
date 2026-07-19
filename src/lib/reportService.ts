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

    async getCurrentStock(companyId: string, role: number) {
        // Fetch only master_products with type = "INTERNAL_RAW"
        const { data: rawProducts, error: prodError } = await supabase
            .from('master_products')
            .select('id, name, sku_code')
            .eq('type', 'INTERNAL_RAW');

        if (prodError) throw prodError;

        const rawProductIds = rawProducts?.map(p => p.id) || [];
        if (rawProductIds.length === 0) {
            return [];
        }

        // If the user is not role 8 (Admin) and companyId is specified, we filter and aggregate by company_id in frontend
        if (role !== 8 && companyId) {
            const { data: ledgerData, error: ledgerError } = await supabase
                .from('inventory_ledger')
                .select('product_id, qty_change')
                .eq('company_id', companyId)
                .in('product_id', rawProductIds);

            if (ledgerError) {
                console.error('[reportService.getCurrentStock] Ledger fetch error:', ledgerError);
                throw ledgerError;
            }

            const stockMap: Record<string, number> = {};
            (ledgerData || []).forEach(item => {
                const pId = item.product_id;
                const qty = Number(item.qty_change) || 0;
                stockMap[pId] = (stockMap[pId] || 0) + qty;
            });

            const formattedData = rawProducts.map(p => ({
                product_id: p.id,
                sku_code: p.sku_code,
                product_name: p.name,
                current_stock_kg: stockMap[p.id] || 0
            })).sort((a, b) => a.product_name.localeCompare(b.product_name));

            return formattedData;
        }

        // Otherwise (Admin or no company filter), fetch from global view
        const { data, error } = await supabase
            .from('view_inventory_current')
            .select('*')
            .in('product_id', rawProductIds)
            .order('product_name', { ascending: true });

        if (error) {
            console.error('[reportService.getCurrentStock] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 2. Sales Out Ledger (Laporan Stok - Pengeluaran)
    async getSalesOutLedger(companyId: string, role: number, dates: DateFilter) {
        let query = supabase
            .from('view_delivery_report')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
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
            console.error('[reportService.getSalesOutLedger] Supabase error:', error);
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
                asal_batu,
                jenis_batu,
                created_by,
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

        if (!data || data.length === 0) return [];

        const userIds = Array.from(new Set(data.map(item => item.created_by).filter(Boolean)));
        
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select('uuid, real_name')
                .in('uuid', userIds as string[]);

            if (!usersError && usersData) {
                usersData.forEach(user => {
                    userMap[user.uuid] = user.real_name;
                });
            }
        }

        return data.map((row: any) => ({
            ...row,
            created_by_name: row.created_by ? (userMap[row.created_by] || null) : null
        }));
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
                created_by,
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

        if (!data || data.length === 0) return [];

        const userIds = Array.from(new Set(data.map(item => item.created_by).filter(Boolean)));
        
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select('uuid, real_name')
                .in('uuid', userIds as string[]);

            if (!usersError && usersData) {
                usersData.forEach(user => {
                    userMap[user.uuid] = user.real_name;
                });
            } else if (usersError) {
                console.error('[reportService.getPenjualan] Users fetch error:', usersError);
            }
        }

        return data.map((row: any) => ({
            ...row,
            created_by_name: row.created_by ? (userMap[row.created_by] || null) : null
        }));
    },

    // 5. Pengiriman (Delivery Orders)
    async getPengiriman(companyId: string, role: number, dates: DateFilter, isCancelled: boolean = false) {
        
        let query = supabase
            .from('view_delivery_report')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
            query = query.eq('company_id', companyId);
        }

        query = query.eq('is_cancel', isCancelled);

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
        
        if (!data || data.length === 0) return [];

        // 1. Map Transporters
        const transporterIds = Array.from(new Set(data.map((row: any) => row.transporter_id).filter(Boolean)));
        let transporterMap: Record<string, string> = {};
        if (transporterIds.length > 0) {
            const { data: transporters } = await supabase
                .from('master_partners')
                .select('id, name')
                .in('id', transporterIds as string[]);
            
            if (transporters) {
                transporters.forEach(t => transporterMap[t.id] = t.name);
            }
        }

        // 2. Fetch DO Items (Qty and Type Production ID)
        const doIds = data.map((row: any) => row.id);
        const { data: doItems, error: doItemsError } = await supabase
            .from('delivery_order_items')
            .select('do_id, produk_net, type_production_id')
            .in('do_id', doIds);
            
        let qtyMap: Record<string, number> = {};
        let typeProdIdMap: Record<string, string> = {};
        
        if (!doItemsError && doItems) {
            doItems.forEach(item => {
                if (item.do_id && item.produk_net != null) {
                    qtyMap[item.do_id] = (qtyMap[item.do_id] || 0) + Number(item.produk_net);
                }
                // If there are multiple items, we'll take the first non-null type_production_id
                if (item.do_id && item.type_production_id && !typeProdIdMap[item.do_id]) {
                    typeProdIdMap[item.do_id] = item.type_production_id;
                }
            });
        }

        // 3. Map Type Production Names
        const typeProdIds = Array.from(new Set(Object.values(typeProdIdMap)));
        let typeProdNameMap: Record<string, string> = {};
        if (typeProdIds.length > 0) {
            const { data: prodTypes } = await supabase
                .from('master_type_production')
                .select('id, nama_type')
                .in('id', typeProdIds as string[]);
                
            if (prodTypes) {
                prodTypes.forEach(pt => typeProdNameMap[pt.id] = pt.nama_type);
            }
        }

        return data.map((row: any) => ({
            ...row,
            produk_net: qtyMap[row.id] || 0,
            transporter_name: row.transporter_id ? (transporterMap[row.transporter_id] || '-') : '-',
            type_production: typeProdIdMap[row.id] ? (typeProdNameMap[typeProdIdMap[row.id]] || '-') : '-'
        }));
    },

    // 6. TCP Input / Laporan TCP
    async getTcp(companyId: string, role: number, dates: DateFilter) {
        
        let query = supabase
            .from('view_tcp_report')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
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
    async getAdjustments(companyId: string, role: number, dates: DateFilter, status?: string) {
        
        let query = supabase
            .from('view_adjustment_report')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
            query = query.eq('company_id', companyId);
        }
        if (dates.startDate) {
            query = query.gte('created_at', `${dates.startDate}T00:00:00Z`);
        }
        if (dates.endDate) {
            query = query.lte('created_at', `${dates.endDate}T23:59:59Z`);
        }
        if (status && status !== 'ALL') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[reportService.getAdjustments] Supabase error:', error);
            throw error;
        }
        
        return data || [];
    },

    // 8. Stock Mutations per Product
    async getStockMutations(productId: string, companyId: string, role: number) {
        let query = supabase
            .from('inventory_ledger')
            .select(`
                id,
                product_id,
                qty_change,
                transaction_type,
                reference_id,
                notes,
                created_at
            `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (role !== 8 && companyId) {
            query = query.eq('company_id', companyId);
        }

        const { data: ledgerData, error } = await query;
        if (error) {
            console.error('[reportService.getStockMutations] Supabase error:', error);
            throw error;
        }

        if (!ledgerData || ledgerData.length === 0) {
            return [];
        }

        // Collect IDs
        const shipmentIds: string[] = [];
        const doIds: string[] = [];

        ledgerData.forEach(item => {
            if (item.reference_id) {
                if (item.transaction_type === 'TALLY_IN') {
                    shipmentIds.push(item.reference_id);
                } else if (item.transaction_type === 'SALES_OUT') {
                    doIds.push(item.reference_id);
                }
            }
        });

        // Fetch shipments and delivery orders in parallel
        const [shipmentsResult, dosResult] = await Promise.all([
            shipmentIds.length > 0
                ? supabase.from('shipments').select('id, vessel_name').in('id', shipmentIds)
                : Promise.resolve({ data: [] as any[], error: null }),
            doIds.length > 0
                ? supabase.from('delivery_orders').select('id, sj_number').in('id', doIds)
                : Promise.resolve({ data: [] as any[], error: null })
        ]);

        if (shipmentsResult.error) throw shipmentsResult.error;
        if (dosResult.error) throw dosResult.error;

        // Create mapping maps
        const shipmentMap = new Map<string, string>();
        (shipmentsResult.data || []).forEach(s => {
            if (s.vessel_name) shipmentMap.set(s.id, s.vessel_name);
        });

        const doMap = new Map<string, string>();
        (dosResult.data || []).forEach(d => {
            if (d.sj_number) doMap.set(d.id, d.sj_number);
        });

        // Map back to ledger items
        return ledgerData.map(item => {
            let detailLabel = '-';
            if (item.reference_id) {
                if (item.transaction_type === 'TALLY_IN') {
                    detailLabel = shipmentMap.get(item.reference_id) || '-';
                } else if (item.transaction_type === 'SALES_OUT') {
                    detailLabel = doMap.get(item.reference_id) || '-';
                }
            }
            return {
                ...item,
                detail_label: detailLabel
            };
        });
    },

    // New Method for Section 1: Riwayat Pergerakan Stok
    async getStockMovementHistory(companyId: string, role: number, dates: DateFilter) {
        let query = supabase
            .from('view_ledger_details')
            .select('*')
            .order('created_at', { ascending: false });

        if (companyId && role !== 8 && role !== 1) {
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
            console.error('[reportService.getStockMovementHistory] Supabase error:', error);
            throw error;
        }
        return data || [];
    },

    // New Method for Section 2: Stok Per Tanggal
    async getStockByDate(companyId: string, role: number, selectedDate: string) {
        const { data: rawProducts, error: prodError } = await supabase
            .from('master_products')
            .select('id, name, sku_code')
            .eq('type', 'INTERNAL_RAW');

        if (prodError) throw prodError;

        const rawProductIds = rawProducts?.map(p => p.id) || [];
        if (rawProductIds.length === 0) return [];

        let query = supabase
            .from('inventory_ledger')
            .select('product_id, qty_change')
            .in('product_id', rawProductIds);

        if (companyId && role !== 8 && role !== 1) {
            query = query.eq('company_id', companyId);
        }

        if (selectedDate) {
            query = query.lte('created_at', `${selectedDate}T23:59:59Z`);
        }

        const { data: ledgerData, error: ledgerError } = await query;

        if (ledgerError) {
            console.error('[reportService.getStockByDate] Ledger fetch error:', ledgerError);
            throw ledgerError;
        }

        const stockMap: Record<string, number> = {};
        (ledgerData || []).forEach(item => {
            const pId = item.product_id;
            const qty = Number(item.qty_change) || 0;
            stockMap[pId] = (stockMap[pId] || 0) + qty;
        });

        const formattedData = rawProducts.map(p => ({
            product_id: p.id,
            sku_code: p.sku_code,
            product_name: p.name,
            stock: stockMap[p.id] || 0
        })).sort((a, b) => a.product_name.localeCompare(b.product_name));

        return formattedData;
    }
};
