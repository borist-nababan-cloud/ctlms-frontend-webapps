/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    TextField,
    MenuItem,
    Typography,
    Stack,
    CircularProgress,
    Alert,
    Divider,
} from '@mui/material';
import {
    PhotoCamera,
    Save as SaveIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { containsHtmlOrScript } from '../../lib/sanitizer';
import { useColorMode } from '../../context/ThemeContext';
import { deliveryService } from '../../lib/deliveryService';
import { masterService } from '../../lib/masterService';
import type { SalesOrderDetailed, Shipment, MasterProduct } from '../../types/supabase';
import ScannerHub from '../../components/common/ScannerHub';

interface DirectDeliveryFormValues {
    sales_order_id: string;
    product_name_sj: string;
    transporter_id: string;
    internal_product_id: string;
    shipment_id: string;
    vessel_name: string;
    truck_plate: string;
    ticket_number: string;
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    photo_url: string;
}

interface DirectDeliveryFormProps {
    open: boolean;
    onClose: () => void;
    deliveryOrder: any | null; // Header record when editing
    onSuccess: (savedDO: any, savedItems: any[]) => void;
}

const DirectDeliveryForm: React.FC<DirectDeliveryFormProps> = ({
    open,
    onClose,
    deliveryOrder,
    onSuccess
}) => {
    const { mode } = useColorMode();
    const { profile: loggedInProfile } = useAuth();

    // Dropdown Data States
    const [salesOrders, setSalesOrders] = useState<SalesOrderDetailed[]>([]);
    const [internalProducts, setInternalProducts] = useState<MasterProduct[]>([]);
    const [transporters, setTransporters] = useState<any[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    
    // UI Loading / Submitting States
    const [loadingData, setLoadingData] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingShipments, setLoadingShipments] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Error States
    const [error, setError] = useState<string | null>(null);
    const [shipmentError, setShipmentError] = useState<string | null>(null);

    // Selected Sales Order Info
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

    const { control, handleSubmit, watch, setValue, getValues, reset, formState: { errors } } = useForm<DirectDeliveryFormValues>({
        defaultValues: {
            sales_order_id: '',
            product_name_sj: '',
            transporter_id: '',
            internal_product_id: '',
            shipment_id: '',
            vessel_name: '',
            truck_plate: '',
            ticket_number: '',
            gross_weight: 0,
            tare_weight: 0,
            net_weight: 0,
            photo_url: ''
        }
    });

    // Watchers to manage strict sequential flow dependencies
    const selectedSOId = watch('sales_order_id');
    const selectedInternalProductId = watch('internal_product_id');

    const gross = watch('gross_weight') || 0;
    const tare = watch('tare_weight') || 0;
    const net = Math.max(0, gross - tare);
    const photoUrl = watch('photo_url');

    // Lock Form Check: Lock if the associated Sales Order is completed, or if the delivery order is completed
    const isLocked = Boolean(deliveryOrder?.sales_order?.is_completed || deliveryOrder?.is_completed);

    // 1. Initial Load of Master Data (Active Sales Orders, Internal Raw Products, Transporters)
    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                setLoadingData(true);
                const [orders, rawProducts, partners] = await Promise.all([
                    deliveryService.getActiveSalesOrders(),
                    deliveryService.getInternalProducts(),
                    masterService.getPartners()
                ]);
                setSalesOrders(orders);
                setInternalProducts(rawProducts);
                setTransporters(partners.filter(p => p.type === 'TRANSPORTER'));
            } catch (err) {
                console.error('Error loading form metadata:', err);
                setError('Gagal memuat data master untuk form.');
            } finally {
                setLoadingData(false);
            }
        };

        if (open) {
            loadDropdowns();
        }
    }, [open]);

    // 2. Handle Edit Mode: Pre-load values
    useEffect(() => {
        const loadExistingItems = async () => {
            if (deliveryOrder && open) {
                setLoadingItems(true);
                setError(null);
                try {
                    const itemsData = await deliveryService.getDeliveryOrderItems(deliveryOrder.id);
                    if (itemsData.length > 0) {
                        const firstItem = itemsData[0];
                        reset({
                            sales_order_id: deliveryOrder.sales_order_id || '',
                            product_name_sj: deliveryOrder.published_product_name || '',
                            transporter_id: deliveryOrder.transporter_id || '',
                            internal_product_id: firstItem.internal_product_id || deliveryOrder.internal_product_id || '',
                            shipment_id: firstItem.shipment_id || deliveryOrder.shipment_id || '',
                            vessel_name: firstItem.vessel_name || deliveryOrder.vessel_name || '',
                            truck_plate: firstItem.truck_plate || deliveryOrder.truck_plate || '',
                            ticket_number: firstItem.ticket_number || deliveryOrder.ticket_number || '',
                            gross_weight: Number(firstItem.gross_weight) || Number(deliveryOrder.gross_weight) || 0,
                            tare_weight: Number(firstItem.tare_weight) || Number(deliveryOrder.tare_weight) || 0,
                            net_weight: Number(firstItem.net_weight) || Number(deliveryOrder.net_weight) || 0,
                            photo_url: firstItem.photo_url || deliveryOrder.photo_url || ''
                        });
                    } else {
                        reset({
                            sales_order_id: deliveryOrder.sales_order_id || '',
                            product_name_sj: deliveryOrder.published_product_name || '',
                            transporter_id: deliveryOrder.transporter_id || '',
                            internal_product_id: deliveryOrder.internal_product_id || '',
                            shipment_id: deliveryOrder.shipment_id || '',
                            vessel_name: deliveryOrder.vessel_name || '',
                            truck_plate: deliveryOrder.truck_plate || '',
                            ticket_number: deliveryOrder.ticket_number || '',
                            gross_weight: Number(deliveryOrder.gross_weight) || 0,
                            tare_weight: Number(deliveryOrder.tare_weight) || 0,
                            net_weight: Number(deliveryOrder.net_weight) || 0,
                            photo_url: deliveryOrder.photo_url || ''
                        });
                    }

                    // Pre-fill read-only Customer & Company
                    setSelectedCustomerName(deliveryOrder.customer_name || '');
                    if (deliveryOrder.company_id) {
                        const comp = await masterService.getCompanyById(deliveryOrder.company_id);
                        setSelectedCompany(comp);
                    }
                } catch (err) {
                    console.error('Error loading delivery order items:', err);
                    setError('Gagal memuat item timbangan.');
                } finally {
                    setLoadingItems(false);
                }
            } else if (open) {
                reset({
                    sales_order_id: '',
                    product_name_sj: '',
                    transporter_id: '',
                    internal_product_id: '',
                    shipment_id: '',
                    vessel_name: '',
                    truck_plate: '',
                    ticket_number: '',
                    gross_weight: 0,
                    tare_weight: 0,
                    net_weight: 0,
                    photo_url: ''
                });
                setSelectedCustomerName('');
                setSelectedCompany(null);
            }
        };

        loadExistingItems();
    }, [deliveryOrder, open, reset]);

    // 3. Sequential Logic 1: Watch sales_order_id to auto-populate customer/company and manage dependencies
    useEffect(() => {
        if (!selectedSOId) {
            setSelectedCustomerName('');
            setSelectedCompany(null);
            if (!deliveryOrder) {
                setValue('product_name_sj', '');
                setValue('transporter_id', '');
            }
            return;
        }

        const so = salesOrders.find(item => item.id === selectedSOId);
        if (so) {
            setSelectedCustomerName(so.customer_name || '-');
            if (!deliveryOrder) {
                setValue('product_name_sj', so.product_name || '');
            }

            const fetchCompany = async () => {
                if (so.company_id) {
                    try {
                        const companyInfo = await masterService.getCompanyById(so.company_id);
                        setSelectedCompany(companyInfo);
                    } catch (err) {
                        console.error('Error fetching company details:', err);
                    }
                } else {
                    setSelectedCompany(null);
                }
            };
            fetchCompany();
        }
    }, [selectedSOId, salesOrders, setValue, deliveryOrder]);

    // 4. Sequential Logic 2: Watch internal_product_id to fetch active shipments and clear dependent vessel fields
    useEffect(() => {
        // Clear dependent vessel fields whenever product changes
        setValue('shipment_id', '');
        setValue('vessel_name', '');
        setShipmentError(null);

        if (!selectedInternalProductId) {
            setShipments([]);
            return;
        }

        const fetchShipmentsForProduct = async () => {
            setLoadingShipments(true);
            try {
                const data = await deliveryService.getShipmentsByProduct(selectedInternalProductId);
                setShipments(data);

                if (data.length === 0) {
                    setShipmentError('Produk ini tidak memiliki pengiriman (shipment) aktif');
                } else if (data.length === 1) {
                    // Auto-select if only 1 shipment exists
                    setValue('shipment_id', data[0].id);
                    setValue('vessel_name', data[0].vessel_name || '');
                } else {
                    // Check if current shipment is valid (mostly during edits)
                    const currentVal = getValues('shipment_id');
                    if (currentVal && !data.some(s => s.id === currentVal)) {
                        setValue('shipment_id', '');
                        setValue('vessel_name', '');
                    }
                }
            } catch (err) {
                console.error('Error fetching shipments:', err);
                setShipmentError('Gagal memuat data vessel.');
            } finally {
                setLoadingShipments(false);
            }
        };

        fetchShipmentsForProduct();
    }, [selectedInternalProductId, setValue, getValues]);

    // Handle Vessel Selection Change
    const handleVesselChange = (shipmentId: string) => {
        const selected = shipments.find(s => s.id === shipmentId);
        if (selected) {
            setValue('shipment_id', selected.id);
            setValue('vessel_name', selected.vessel_name || '');
        } else {
            setValue('shipment_id', '');
            setValue('vessel_name', '');
        }
    };

    // Handle OCR data capture from ScannerHub
    const handleOcrCapture = (result: any) => {
        if (result.photo_url) setValue('photo_url', result.photo_url);
        if (result.truck_plate) setValue('truck_plate', result.truck_plate);
        if (result.ticket_number) setValue('ticket_number', result.ticket_number);
        if (result.gross_weight) {
            setValue('gross_weight', result.gross_weight);
            setValue('net_weight', Math.max(0, result.gross_weight - tare));
        }
        if (result.tare_weight) {
            setValue('tare_weight', result.tare_weight);
            setValue('net_weight', Math.max(0, (getValues('gross_weight') || 0) - result.tare_weight));
        }
    };

    // Form onSubmit
    const onSubmit = async (data: DirectDeliveryFormValues) => {
        setError(null);
        setSubmitting(true);

        const trimmedProductNameSj = data.product_name_sj?.trim();
        if (!trimmedProductNameSj) {
            setError('Nama Produk (untuk SJ) wajib diisi');
            setSubmitting(false);
            return;
        }

        if (containsHtmlOrScript(trimmedProductNameSj)) {
            setError('Input mengandung karakter tidak valid atau script berbahaya');
            setSubmitting(false);
            return;
        }

        // Validate fields
        if (!data.transporter_id) {
            setError('Transporter wajib dipilih.');
            setSubmitting(false);
            return;
        }
        if (!data.internal_product_id) {
            setError('Mohon pilih Produk Internal terlebih dahulu.');
            setSubmitting(false);
            return;
        }
        if (!data.shipment_id) {
            setError('Vessel/Tongkang wajib dipilih.');
            setSubmitting(false);
            return;
        }
        if (!data.truck_plate?.trim()) {
            setError('No. Polisi wajib diisi.');
            setSubmitting(false);
            return;
        }
        if (!data.ticket_number?.trim()) {
            setError('Nomor Ticket wajib diisi.');
            setSubmitting(false);
            return;
        }
        if (containsHtmlOrScript(data.truck_plate) || containsHtmlOrScript(data.ticket_number)) {
            setError('Input mengandung karakter tidak valid atau script berbahaya.');
            setSubmitting(false);
            return;
        }
        if (Number(data.gross_weight) <= 0) {
            setError('Gross harus lebih besar dari 0.');
            setSubmitting(false);
            return;
        }

        // Fetch SO company id details
        let so = salesOrders.find(item => item.id === data.sales_order_id);
        if (!so && deliveryOrder) {
            so = {
                id: deliveryOrder.sales_order_id,
                order_no: deliveryOrder.so_number || '-',
                customer_name: deliveryOrder.customer_name || '-',
                product_name: deliveryOrder.product_name || '-',
                qty_ordered: 0,
                price_per_kg: 0,
                status: 'CONFIRMED',
                is_completed: false,
                company_id: deliveryOrder.company_id,
                customer_id: '',
                product_id: ''
            };
        }

        if (!so) {
            setError('Sales Order tidak valid.');
            setSubmitting(false);
            return;
        }

        const calculatedNet = Math.max(0, (Number(data.gross_weight) || 0) - (Number(data.tare_weight) || 0));

        // Detail payload: single truck containing all explicit fields
        const itemsPayload = [
            {
                id: deliveryOrder?.items?.[0]?.id || undefined,
                internal_product_id: data.internal_product_id,
                shipment_id: data.shipment_id,
                vessel_name: data.vessel_name,
                truck_plate: data.truck_plate.trim().toUpperCase(),
                ticket_number: data.ticket_number.trim().toUpperCase(),
                gross_weight: Number(data.gross_weight) || 0,
                tare_weight: Number(data.tare_weight) || 0,
                net_weight: calculatedNet,
                photo_url: data.photo_url || '',
                type_production_id: null,
                blending_id: null,
                produk_net: calculatedNet
            }
        ];

        // Header payload: mirror the values of the single truck and include new transporter values
        const headerPayload = {
            sales_order_id: data.sales_order_id,
            published_product_name: trimmedProductNameSj,
            company_id: so.company_id,
            created_by: loggedInProfile?.uuid || null,
            delivery_type: 'DIRECT' as const,
            truck_plate: data.truck_plate.trim().toUpperCase(),
            ticket_number: data.ticket_number.trim().toUpperCase(),
            gross_weight: Number(data.gross_weight) || 0,
            tare_weight: Number(data.tare_weight) || 0,
            net_weight: calculatedNet,
            shipment_id: data.shipment_id || null,
            vessel_name: data.vessel_name || null,
            internal_product_id: data.internal_product_id || null,
            type_blending: 'NONE' as const,
            transporter_id: data.transporter_id || null,
            adjust_weight: 0 // Explicitly set to 0 based on schema migration defaults
        };

        try {
            let savedHeader;
            if (deliveryOrder) {
                savedHeader = await deliveryService.updateDeliveryOrderWithItems(deliveryOrder.id, headerPayload, itemsPayload);
            } else {
                savedHeader = await deliveryService.createDeliveryOrderWithItems(headerPayload, itemsPayload);
            }

            onSuccess(savedHeader, itemsPayload);
            onClose();
        } catch (err: any) {
            console.error('Error saving delivery order:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(15px)',
                    background: mode === 'dark'
                        ? 'rgba(30, 30, 30, 0.95)'
                        : 'rgba(255, 255, 255, 0.98)',
                }
            }}
        >
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {deliveryOrder ? 'Edit Surat Jalan' : 'Buat Surat Jalan Baru'} (Pengiriman Langsung)
                </DialogTitle>
                <DialogContent sx={{ mt: 2, pb: 1, maxHeight: '70vh', overflowY: 'auto' }}>
                    {loadingData || loadingItems ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {isLocked && (
                                <Grid size={12}>
                                    <Alert severity="warning">
                                        Transaksi penjualan ini telah selesai dan dikunci. Data tidak dapat diubah kembali.
                                    </Alert>
                                </Grid>
                            )}

                            {(error || Object.keys(errors).length > 0) && (
                                <Grid size={12}>
                                    <Alert severity="error">
                                        {error || "Ada kesalahan pengisian form. Silakan periksa kembali semua inputan Anda."}
                                    </Alert>
                                </Grid>
                            )}

                            {/* No. Surat Jalan */}
                            <Grid size={12}>
                                <TextField
                                    label="No. Surat Jalan"
                                    value={deliveryOrder ? deliveryOrder.sj_number : 'Otomatis'}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                    size="small"
                                />
                            </Grid>

                            {/* ========================================================================= */}
                            {/* HEADER SECTION (INFORMASI MASTER)                                        */}
                            {/* ========================================================================= */}
                            <Grid size={12} sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    Informasi Master / Induk (Header)
                                </Typography>
                                <Divider sx={{ my: 1 }} />
                            </Grid>

                            {/* 1. Pilih Sales Order */}
                            <Grid size={12}>
                                <Controller
                                    name="sales_order_id"
                                    control={control}
                                    rules={{ required: 'Sales Order wajib dipilih' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Sales Order"
                                            fullWidth
                                            error={!!errors.sales_order_id}
                                            helperText={errors.sales_order_id?.message}
                                            disabled={!!deliveryOrder || isLocked}
                                            size="small"
                                        >
                                            {salesOrders.map(so => (
                                                <MenuItem key={so.id} value={so.id}>
                                                    {so.order_no} - {so.customer_name} ({so.product_name})
                                                </MenuItem>
                                            ))}
                                            {deliveryOrder && !salesOrders.some(so => so.id === deliveryOrder.sales_order_id) && (
                                                <MenuItem key={deliveryOrder.sales_order_id} value={deliveryOrder.sales_order_id}>
                                                    {deliveryOrder.so_number} - {deliveryOrder.customer_name} ({deliveryOrder.product_name})
                                                </MenuItem>
                                            )}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            {/* 2. Pilih Transporter (Enabled only after SO selected) */}
                            <Grid size={12}>
                                <Controller
                                    name="transporter_id"
                                    control={control}
                                    rules={{ required: 'Transporter wajib dipilih' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Pilih Transporter"
                                            fullWidth
                                            error={!!errors.transporter_id}
                                            helperText={errors.transporter_id?.message}
                                            disabled={!selectedSOId || isLocked}
                                            size="small"
                                        >
                                            {transporters.map(trans => (
                                                <MenuItem key={trans.id} value={trans.id}>
                                                    {trans.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            {/* 3. Customer (Locked / Auto-populated) */}
                            <Grid size={12}>
                                <TextField
                                    label="Customer"
                                    value={selectedCustomerName}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Otomatis terisi"
                                    size="small"
                                />
                            </Grid>

                            {/* 4. Perusahaan (Locked / Auto-populated) */}
                            <Grid size={12}>
                                <TextField
                                    label="Perusahaan"
                                    value={selectedCompany?.name || ''}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Otomatis terisi"
                                    size="small"
                                />
                            </Grid>

                            {/* 5. Nama Produk untuk SJ */}
                            <Grid size={12}>
                                <Controller
                                    name="product_name_sj"
                                    control={control}
                                    rules={{ required: 'Nama Produk (untuk SJ) wajib diisi' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Nama Produk (untuk SJ)"
                                            fullWidth
                                            error={!!errors.product_name_sj}
                                            helperText={errors.product_name_sj?.message}
                                            InputLabelProps={{ shrink: true }}
                                            disabled={!!deliveryOrder || isLocked}
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* ========================================================================= */}
                            {/* DETAIL SECTION (INFORMASI BONGKAR MUAT & TIMBANGAN)                     */}
                            {/* ========================================================================= */}
                            <Grid size={12} sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    Informasi Bongkar Muat & Timbangan (Detail)
                                </Typography>
                                <Divider sx={{ my: 1 }} />
                            </Grid>

                            {/* 1. Pilih Produk Internal (Raw) */}
                            <Grid size={12}>
                                <Controller
                                    name="internal_product_id"
                                    control={control}
                                    rules={{ required: 'Produk Internal wajib dipilih' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Produk Internal (Raw)"
                                            fullWidth
                                            error={!!errors.internal_product_id}
                                            helperText={errors.internal_product_id?.message}
                                            disabled={!selectedSOId || isLocked}
                                            size="small"
                                        >
                                            {internalProducts.map(p => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            {/* Warning Banner if product has no shipments */}
                            {shipmentError && (
                                <Grid size={12}>
                                    <Alert severity="warning">
                                        {shipmentError}
                                    </Alert>
                                </Grid>
                            )}

                            {/* 2. Pilih Vessel / Tongkang */}
                            <Grid size={12}>
                                <Controller
                                    name="shipment_id"
                                    control={control}
                                    rules={{ required: 'Vessel/Tongkang wajib dipilih' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Pilih Vessel/Tongkang"
                                            fullWidth
                                            disabled={loadingShipments || !selectedInternalProductId || isLocked || shipments.length === 0}
                                            error={!!errors.shipment_id}
                                            helperText={errors.shipment_id?.message || (loadingShipments ? 'Memuat...' : '')}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                handleVesselChange(e.target.value);
                                            }}
                                            size="small"
                                        >
                                            {shipments.map(s => (
                                                <MenuItem key={s.id} value={s.id}>
                                                    {s.vessel_name} - {s.invoice_no}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            {/* 3. No. Polisi */}
                            <Grid size={12}>
                                <Controller
                                    name="truck_plate"
                                    control={control}
                                    rules={{ required: 'No. Polisi wajib diisi' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="No. Polisi"
                                            fullWidth
                                            disabled={!selectedInternalProductId || isLocked}
                                            placeholder="e.g. B 1234 XY"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            error={!!errors.truck_plate}
                                            helperText={errors.truck_plate ? 'Wajib diisi' : ''}
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* 4. Nomor Ticket */}
                            <Grid size={12}>
                                <Controller
                                    name="ticket_number"
                                    control={control}
                                    rules={{ required: 'Nomor Ticket wajib diisi' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Nomor Ticket"
                                            fullWidth
                                            disabled={!selectedInternalProductId || isLocked}
                                            placeholder="e.g. T-12345"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            error={!!errors.ticket_number}
                                            helperText={errors.ticket_number ? 'Wajib diisi' : ''}
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* 5. Gross (Kg) */}
                            <Grid size={12}>
                                <Controller
                                    name="gross_weight"
                                    control={control}
                                    rules={{ required: 'Gross wajib diisi & > 0', min: { value: 1, message: 'Gross harus > 0' } }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Gross (Kg)"
                                            type="number"
                                            fullWidth
                                            disabled={!selectedInternalProductId || isLocked}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                field.onChange(val);
                                                setValue('net_weight', Math.max(0, val - tare));
                                            }}
                                            error={!!errors.gross_weight}
                                            helperText={errors.gross_weight?.message}
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* 6. Tare (Kg) */}
                            <Grid size={12}>
                                <Controller
                                    name="tare_weight"
                                    control={control}
                                    rules={{ required: 'Tare wajib diisi & >= 0', min: { value: 0, message: 'Tare harus >= 0' } }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Tare (Kg)"
                                            type="number"
                                            fullWidth
                                            disabled={!selectedInternalProductId || isLocked}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                field.onChange(val);
                                                setValue('net_weight', Math.max(0, gross - val));
                                            }}
                                            error={!!errors.tare_weight}
                                            helperText={errors.tare_weight?.message}
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* 7. Netto (Kg) (Read-only Display) */}
                            <Grid size={12}>
                                <Box sx={{
                                    bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    p: 1.5,
                                    borderRadius: 2,
                                    textAlign: 'center',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    boxSizing: 'border-box'
                                }}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                        Netto (Kg)
                                    </Typography>
                                    <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mt: 0.5 }}>
                                        {net.toLocaleString('id-ID')} Kg
                                    </Typography>
                                </Box>
                            </Grid>

                            {/* 8. Foto OCR Scan & Preview */}
                            <Grid size={12}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PhotoCamera />}
                                        disabled={submitting || !selectedInternalProductId || isLocked}
                                        onClick={() => setIsScannerOpen(true)}
                                        sx={{ textTransform: 'none', borderStyle: 'dashed' }}
                                    >
                                        Scan Tiket Timbangan
                                    </Button>

                                    {photoUrl && (
                                        <Box sx={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid divider' }}>
                                            <img src={photoUrl} alt="Ticket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </Box>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        color="inherit"
                        disabled={submitting}
                        sx={{ borderRadius: '20px', textTransform: 'none' }}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitting || loadingData || loadingItems || isLocked}
                        variant="contained"
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3,
                            background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                        }}
                    >
                        {submitting ? 'Menyimpan...' : 'Simpan Pengiriman'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
        <ScannerHub
            open={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onCapture={handleOcrCapture}
        />
        </>
    );
};

export default DirectDeliveryForm;
