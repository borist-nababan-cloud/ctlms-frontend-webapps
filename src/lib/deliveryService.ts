import { supabase } from './supabaseClient';
import type { DeliveryOrder, SalesOrderDetailed, Shipment, MasterProduct } from '../types/supabase';

export const deliveryService = {
    getActiveSalesOrders: async (): Promise<SalesOrderDetailed[]> => {
        const { data, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                customer:master_partners(name),
                product:master_products(name, sku_code),
                company:master_companies(name)
            `)
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((so: any) => ({
            ...so,
            customer_name: so.customer?.name || '-',
            product_name: so.product_name || so.product?.name || '-',
            sku_code: so.product?.sku_code || '-',
            company_name: so.company?.name || '-'
        }));
    },

    getInternalProducts: async (): Promise<MasterProduct[]> => {
        const { data, error } = await supabase
            .from('master_products')
            .select('*')
            .eq('type', 'INTERNAL_RAW')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    getShipmentsByProduct: async (productId: string): Promise<Shipment[]> => {
        // Fetch all shipments regardless of is_completed or completed status
        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getProductionTypes: async (): Promise<any[]> => {
        const { data, error } = await supabase
            .from('master_type_production')
            .select('*')
            .order('nama_type', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    getBlendingTypes: async (): Promise<any[]> => {
        const { data, error } = await supabase
            .from('master_blending')
            .select('*')
            .order('nama_blending', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    generateSjNumber: async (companyId: string): Promise<string> => {
        const { data, error } = await supabase.rpc('generate_sj_number', { p_company_id: companyId });
        if (error) throw error;
        return data;
    },

    getDeliveryOrderItems: async (doId: string): Promise<any[]> => {
        const { data, error } = await supabase
            .from('delivery_order_items')
            .select(`
                *,
                internal_product:master_products!internal_product_id (
                    name
                ),
                type_production:master_type_production!type_production_id (
                    nama_type
                ),
                blending:master_blending!blending_id (
                    nama_blending
                )
            `)
            .eq('do_id', doId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    createDeliveryOrder: async (deliveryOrder: Partial<DeliveryOrder>): Promise<DeliveryOrder> => {
        const { data, error } = await supabase
            .from('delivery_orders')
            .insert(deliveryOrder)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateDeliveryOrder: async (id: string, deliveryOrder: Partial<DeliveryOrder>): Promise<DeliveryOrder> => {
        const { data, error } = await supabase
            .from('delivery_orders')
            .update(deliveryOrder)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    createDeliveryOrderWithItems: async (
        deliveryOrder: Partial<DeliveryOrder>,
        items: any[]
    ): Promise<any> => {
        let sjNumber = deliveryOrder.sj_number;
        if (!sjNumber && deliveryOrder.company_id) {
            sjNumber = await deliveryService.generateSjNumber(deliveryOrder.company_id);
        }

        const totalNetWeight = deliveryOrder.net_weight !== undefined && deliveryOrder.net_weight !== null
            ? deliveryOrder.net_weight
            : (items || []).reduce((sum, item) => {
                const net = Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0));
                return sum + net;
            }, 0);

        const headerPayload = {
            ...deliveryOrder,
            sj_number: sjNumber,
            net_weight: totalNetWeight
        };

        const { data: headerData, error: headerError } = await supabase
            .from('delivery_orders')
            .insert(headerPayload)
            .select()
            .single();

        if (headerError) throw headerError;
        const doId = headerData.id;

        if (items && items.length > 0) {
            const itemsPayload = items.map(item => {
                if (!item.internal_product_id) {
                    throw new Error("Validation Error: internal_product_id is missing or undefined");
                }
                if (!item.truck_plate?.trim()) {
                    throw new Error("Validation Error: truck_plate is missing or empty");
                }

                return {
                    do_id: doId,
                    internal_product_id: item.internal_product_id,
                    truck_plate: item.truck_plate.trim().toUpperCase(),
                    gross_weight: Number(item.gross_weight) || 0,
                    tare_weight: Number(item.tare_weight) || 0,
                    net_weight: Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0)),
                    photo_url: item.photo_url || null,
                    shipment_id: item.shipment_id || null,
                    vessel_name: item.vessel_name || null,
                    type_production_id: item.type_production_id || null,
                    blending_id: item.blending_id || null,
                    produk_net: item.produk_net !== undefined && item.produk_net !== null ? Number(item.produk_net) : Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0))
                };
            });



            const { error: itemsError } = await supabase
                .from('delivery_order_items')
                .insert(itemsPayload);

            if (itemsError) {
                await supabase.from('delivery_orders').delete().eq('id', doId);
                throw itemsError;
            }
        }

        return {
            ...headerData,
            sj_number: sjNumber
        };
    },

    updateDeliveryOrderWithItems: async (
        doId: string,
        deliveryOrder: Partial<DeliveryOrder>,
        items: any[]
    ): Promise<any> => {
        const totalNetWeight = deliveryOrder.net_weight !== undefined && deliveryOrder.net_weight !== null
            ? deliveryOrder.net_weight
            : (items || []).reduce((sum, item) => {
                const net = Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0));
                return sum + net;
            }, 0);

        const headerPayload = {
            ...deliveryOrder,
            net_weight: totalNetWeight
        };

        const { data: headerData, error: headerError } = await supabase
            .from('delivery_orders')
            .update(headerPayload)
            .eq('id', doId)
            .select()
            .single();

        if (headerError) throw headerError;

        const { error: deleteError } = await supabase
            .from('delivery_order_items')
            .delete()
            .eq('do_id', doId);

        if (deleteError) throw deleteError;

        if (items && items.length > 0) {
            const itemsPayload = items.map(item => {
                if (!item.internal_product_id) {
                    throw new Error("Validation Error: internal_product_id is missing or undefined");
                }
                if (!item.truck_plate?.trim()) {
                    throw new Error("Validation Error: truck_plate is missing or empty");
                }

                return {
                    do_id: doId,
                    internal_product_id: item.internal_product_id,
                    truck_plate: item.truck_plate.trim().toUpperCase(),
                    gross_weight: Number(item.gross_weight) || 0,
                    tare_weight: Number(item.tare_weight) || 0,
                    net_weight: Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0)),
                    photo_url: item.photo_url || null,
                    shipment_id: item.shipment_id || null,
                    vessel_name: item.vessel_name || null,
                    type_production_id: item.type_production_id || null,
                    blending_id: item.blending_id || null,
                    produk_net: item.produk_net !== undefined && item.produk_net !== null ? Number(item.produk_net) : Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0))
                };
            });



            const { error: itemsError } = await supabase
                .from('delivery_order_items')
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        return headerData;
    },

    getDeliveryOrdersDetailed: async (deliveryType?: 'DIRECT' | 'STOCKPILE'): Promise<any[]> => {
        let query = supabase
            .from('delivery_orders')
            .select(`
                *,
                sales_order:sales_orders (
                    order_no,
                    customer:master_partners (name),
                    product:master_products (name)
                ),
                shipment:shipments (
                    vessel_name,
                    invoice_no,
                    product_id
                ),
                company:master_companies (
                    name
                ),
                delivery_order_items (
                    *,
                    internal_product:master_products!internal_product_id (
                        name
                    ),
                    type_production:master_type_production!type_production_id (
                        nama_type
                    ),
                    blending:master_blending!blending_id (
                        nama_blending
                    )
                )
            `);

        if (deliveryType) {
            query = query.eq('delivery_type', deliveryType);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((doItem: any) => {
            const items = doItem.delivery_order_items || [];
            const totalNetWeight = items.reduce((sum: number, item: any) => sum + (Number(item.net_weight) || 0), 0);
            const firstItem = items[0] || {};
            
            // Get unique vessel names from items for display in data table
            const uniqueVessels = Array.from(
                new Set(items.map((item: any) => item.vessel_name).filter(Boolean))
            );
            const vesselDisplay = uniqueVessels.length > 0 
                ? uniqueVessels.join(', ')
                : (doItem.vessel_name || (doItem.shipment ? `${doItem.shipment.vessel_name} - ${doItem.shipment.invoice_no}` : '-'));

            return {
                ...doItem,
                so_number: doItem.sales_order?.order_no || '-',
                customer_name: doItem.sales_order?.customer?.name || '-',
                product_name: doItem.published_product_name || doItem.sales_order?.product?.name || '-',
                company_name: doItem.company?.name || '-',
                vessel_display: vesselDisplay,
                internal_product_name: firstItem.internal_product?.name || '-',
                net_weight: doItem.delivery_type === 'STOCKPILE' && doItem.net_weight !== null && doItem.net_weight !== undefined ? Number(doItem.net_weight) : totalNetWeight,
                items: items
            };
        });
    }
};
