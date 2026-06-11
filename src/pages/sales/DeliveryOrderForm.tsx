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
    Divider,
    IconButton,
    Card,
    CardContent,
    Stack,
    CircularProgress,
    Alert,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    PhotoCamera,
    Image as ImageIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { deliveryService } from '../../lib/deliveryService';
import { masterService } from '../../lib/masterService';
import { logisticsService } from '../../lib/logisticsService';
import type { SalesOrderDetailed, Shipment, MasterProduct } from '../../types/supabase';

interface DeliveryOrderItemFormValue {
    id?: string;
    internal_product_id: string;
    shipment_id?: string | null;
    vessel_name?: string | null;
    type_production_id: string;
    blending_id: string;
    truck_plate: string;
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    photo_url: string;
}

interface DeliveryOrderFormValues {
    sales_order_id: string;
    product_name_sj: string;
    truck_plate?: string;
    ticket_number?: string;
    items: DeliveryOrderItemFormValue[];
}

interface DeliveryOrderFormProps {
    open: boolean;
    onClose: () => void;
    deliveryOrder: any | null; // Header record when editing
    onSuccess: (savedDO: any, savedItems: any[]) => void;
    deliveryType: 'DIRECT' | 'STOCKPILE';
}

// Sub-component for individual truck rows to manage its own vessel/shipment fetching dynamically
interface DeliveryOrderItemRowProps {
    index: number;
    control: any;
    setValue: any;
    getValues: any;
    watch: any;
    remove: (idx: number) => void;
    fieldsLength: number;
    internalProducts: MasterProduct[];
    productionTypes: any[];
    blendingTypes: any[];
    deliveryType: 'DIRECT' | 'STOCKPILE';
    mode: 'light' | 'dark';
    scanningIndex: number | null;
    submitting: boolean;
    handleScanTicket: (event: React.ChangeEvent<HTMLInputElement>, idx: number) => Promise<void>;
    errors: any;
}

const DeliveryOrderItemRow: React.FC<DeliveryOrderItemRowProps> = ({
    index,
    control,
    setValue,
    getValues,
    watch,
    remove,
    fieldsLength,
    internalProducts,
    productionTypes,
    blendingTypes,
    deliveryType,
    mode,
    scanningIndex,
    submitting,
    handleScanTicket,
    errors
}) => {
    // Watch the selected internal product for this row to fetch shipments
    const selectedProductId = useWatch({
        control,
        name: `items.${index}.internal_product_id`
    });

    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loadingShipments, setLoadingShipments] = useState(false);
    const [shipmentError, setShipmentError] = useState<string | null>(null);

    useEffect(() => {
        if (deliveryType !== 'DIRECT') return;
        if (!selectedProductId) {
            setShipments([]);
            setShipmentError(null);
            setValue(`items.${index}.shipment_id`, '');
            setValue(`items.${index}.vessel_name`, '');
            return;
        }

        const fetchShipments = async () => {
            setLoadingShipments(true);
            setShipmentError(null);
            try {
                const data = await deliveryService.getShipmentsByProduct(selectedProductId);
                setShipments(data);
                
                if (data.length === 1) {
                    // Exactly 1 shipment found, auto-select it
                    setValue(`items.${index}.shipment_id`, data[0].id);
                    setValue(`items.${index}.vessel_name`, data[0].vessel_name || '');
                } else if (data.length === 0) {
                    setShipmentError('Tidak ada pengiriman (shipment) untuk produk ini');
                    setValue(`items.${index}.shipment_id`, '');
                    setValue(`items.${index}.vessel_name`, '');
                } else {
                    // Multiple found. Clear selection if current value is invalid
                    const currentVal = getValues(`items.${index}.shipment_id`);
                    if (currentVal && !data.some(s => s.id === currentVal)) {
                        setValue(`items.${index}.shipment_id`, '');
                        setValue(`items.${index}.vessel_name`, '');
                    }
                }
            } catch (err) {
                console.error('Error fetching shipments for item:', err);
                setShipmentError('Gagal memuat data vessel.');
            } finally {
                setLoadingShipments(false);
            }
        };

        fetchShipments();
    }, [selectedProductId, index, setValue, getValues, deliveryType]);

    const handleVesselChange = (shipmentId: string) => {
        const selected = shipments.find(s => s.id === shipmentId);
        if (selected) {
            setValue(`items.${index}.shipment_id`, selected.id);
            setValue(`items.${index}.vessel_name`, selected.vessel_name || '');
        } else {
            setValue(`items.${index}.shipment_id`, '');
            setValue(`items.${index}.vessel_name`, '');
        }
    };

    const gross = watch(`items.${index}.gross_weight`) || 0;
    const tare = watch(`items.${index}.tare_weight`) || 0;
    const net = Math.max(0, gross - tare);
    const photoUrl = watch(`items.${index}.photo_url`);

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                background: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                position: 'relative'
            }}
        >
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Truk #{index + 1}
                    </Typography>
                    {fieldsLength > 1 && (
                        <Tooltip title="Hapus Truk">
                            <IconButton size="small" color="error" onClick={() => remove(index)}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.internal_product_id`}
                            control={control}
                            rules={{ required: true }}
                            render={({ field: selectField }) => (
                                <TextField
                                    {...selectField}
                                    select
                                    label="Produk Internal (Raw)"
                                    fullWidth
                                    size="small"
                                    error={!!errors?.items?.[index]?.internal_product_id}
                                    helperText={errors?.items?.[index]?.internal_product_id ? 'Wajib dipilih' : ''}
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

                    {/* Show Vessel dropdown inside Detail row ONLY if deliveryType === 'DIRECT' */}
                    {deliveryType === 'DIRECT' && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Controller
                                name={`items.${index}.shipment_id`}
                                control={control}
                                rules={{ required: true }}
                                render={({ field: selectField }) => (
                                    <TextField
                                        {...selectField}
                                        select
                                        label="Pilih Vessel/Tongkang"
                                        fullWidth
                                        size="small"
                                        disabled={loadingShipments || !selectedProductId}
                                        error={!!errors?.items?.[index]?.shipment_id || !!shipmentError}
                                        helperText={shipmentError || (errors?.items?.[index]?.shipment_id ? 'Wajib dipilih' : '') || (loadingShipments ? 'Memuat...' : '')}
                                        onChange={(e) => {
                                            selectField.onChange(e.target.value);
                                            handleVesselChange(e.target.value);
                                        }}
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
                    )}

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.truck_plate`}
                            control={control}
                            rules={{ required: true }}
                            render={({ field: textField }) => (
                                <TextField
                                    {...textField}
                                    label="No. Polisi"
                                    fullWidth
                                    size="small"
                                    placeholder="e.g. B 1234 XY"
                                    onChange={(e) => textField.onChange(e.target.value.toUpperCase())}
                                    error={!!errors?.items?.[index]?.truck_plate}
                                    helperText={errors?.items?.[index]?.truck_plate ? 'Wajib diisi' : ''}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.type_production_id`}
                            control={control}
                            render={({ field: selectField }) => (
                                <TextField
                                    {...selectField}
                                    select
                                    label="Tipe Produksi"
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value=""><em>Tidak ada</em></MenuItem>
                                    {productionTypes.map(pt => (
                                        <MenuItem key={pt.id} value={pt.id}>
                                            {pt.nama_type}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.blending_id`}
                            control={control}
                            render={({ field: selectField }) => (
                                <TextField
                                    {...selectField}
                                    select
                                    label="Blending"
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value=""><em>Tidak ada</em></MenuItem>
                                    {blendingTypes.map(b => (
                                        <MenuItem key={b.id} value={b.id}>
                                            {b.nama_blending}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.gross_weight`}
                            control={control}
                            rules={{ required: true, min: 1 }}
                            render={({ field: numField }) => (
                                <TextField
                                    {...numField}
                                    label="Gross (Kg)"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        numField.onChange(val);
                                        setValue(`items.${index}.net_weight`, Math.max(0, val - tare));
                                    }}
                                    error={!!errors?.items?.[index]?.gross_weight}
                                    helperText={errors?.items?.[index]?.gross_weight ? 'Wajib diisi & > 0' : ''}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name={`items.${index}.tare_weight`}
                            control={control}
                            rules={{ required: true, min: 0 }}
                            render={({ field: numField }) => (
                                <TextField
                                    {...numField}
                                    label="Tare (Kg)"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        numField.onChange(val);
                                        setValue(`items.${index}.net_weight`, Math.max(0, gross - val));
                                    }}
                                    error={!!errors?.items?.[index]?.tare_weight}
                                    helperText={errors?.items?.[index]?.tare_weight ? 'Wajib diisi & >= 0' : ''}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', p: 1, borderRadius: 2, textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>Netto (Kg)</Typography>
                            <Typography variant="subtitle1" color="primary" fontWeight="bold" sx={{ mt: -0.5 }}>
                                {net.toLocaleString('id-ID')}
                            </Typography>
                        </Box>
                    </Grid>

                    {/* OCR camera scan per item */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                startIcon={scanningIndex === index ? <CircularProgress size={16} /> : <PhotoCamera />}
                                disabled={scanningIndex !== null || submitting}
                                sx={{ textTransform: 'none', borderStyle: 'dashed' }}
                            >
                                {scanningIndex === index ? 'Menganalisis...' : 'Kamera'}
                                <input
                                    hidden
                                    accept="image/*"
                                    type="file"
                                    onChange={(e) => handleScanTicket(e, index)}
                                    {...({ capture: 'environment' } as any)}
                                />
                            </Button>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                startIcon={scanningIndex === index ? <CircularProgress size={16} /> : <ImageIcon />}
                                disabled={scanningIndex !== null || submitting}
                                color="secondary"
                                sx={{ textTransform: 'none', borderStyle: 'dashed' }}
                            >
                                {scanningIndex === index ? 'Menganalisis...' : 'Galeri'}
                                <input
                                    hidden
                                    accept="image/*"
                                    type="file"
                                    onChange={(e) => handleScanTicket(e, index)}
                                />
                            </Button>

                            {photoUrl && (
                                <Box sx={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid divider' }}>
                                    <img src={photoUrl} alt="Ticket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </Box>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

const DeliveryOrderForm: React.FC<DeliveryOrderFormProps> = ({
    open,
    onClose,
    deliveryOrder,
    onSuccess,
    deliveryType
}) => {
    const { mode } = useColorMode();
    const { profile: loggedInProfile } = useAuth();

    // Dropdown Data States
    const [salesOrders, setSalesOrders] = useState<SalesOrderDetailed[]>([]);
    const [internalProducts, setInternalProducts] = useState<MasterProduct[]>([]);
    const [productionTypes, setProductionTypes] = useState<any[]>([]);
    const [blendingTypes, setBlendingTypes] = useState<any[]>([]);
    
    // UI Loading / Submitting States
    const [loadingData, setLoadingData] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scanningIndex, setScanningIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Selected Sales Order Info
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

    const { control, handleSubmit, watch, setValue, reset, getValues, formState: { errors } } = useForm<DeliveryOrderFormValues>({
        defaultValues: {
            sales_order_id: '',
            product_name_sj: '',
            truck_plate: '',
            ticket_number: '',
            items: [
                {
                    internal_product_id: '',
                    shipment_id: '',
                    vessel_name: '',
                    type_production_id: '',
                    blending_id: '',
                    truck_plate: '',
                    gross_weight: 0,
                    tare_weight: 0,
                    net_weight: 0,
                    photo_url: ''
                }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    const selectedSOId = watch('sales_order_id');
    const watchItems = watch('items');

    // Load static dropdown lists
    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                setLoadingData(true);
                const [orders, rawProducts, prodTypes, blendTypes] = await Promise.all([
                    deliveryService.getActiveSalesOrders(),
                    deliveryService.getInternalProducts(),
                    deliveryService.getProductionTypes(),
                    deliveryService.getBlendingTypes()
                ]);
                setSalesOrders(orders);
                setInternalProducts(rawProducts);
                setProductionTypes(prodTypes);
                setBlendingTypes(blendTypes);
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

    // Handle Edit Mode: Load items and set form states
    useEffect(() => {
        const loadExistingItems = async () => {
            if (deliveryOrder && open) {
                setLoadingItems(true);
                setError(null);
                try {
                    const itemsData = await deliveryService.getDeliveryOrderItems(deliveryOrder.id);
                    reset({
                        sales_order_id: deliveryOrder.sales_order_id || '',
                        product_name_sj: deliveryOrder.published_product_name || '',
                        truck_plate: deliveryOrder.truck_plate || '',
                        ticket_number: deliveryOrder.ticket_number || '',
                        items: itemsData.map(item => ({
                            id: item.id,
                            internal_product_id: item.internal_product_id || '',
                            shipment_id: item.shipment_id || '',
                            vessel_name: item.vessel_name || '',
                            type_production_id: item.type_production_id || '',
                            blending_id: item.blending_id || '',
                            truck_plate: item.truck_plate || '',
                            gross_weight: Number(item.gross_weight) || 0,
                            tare_weight: Number(item.tare_weight) || 0,
                            net_weight: Number(item.net_weight) || 0,
                            photo_url: item.photo_url || ''
                        }))
                    });

                    // Set Customer and Company manually since the SO selection effect won't fire if the SO isn't in active lists
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
                    truck_plate: '',
                    ticket_number: '',
                    items: [
                        {
                            internal_product_id: '',
                            shipment_id: '',
                            vessel_name: '',
                            type_production_id: '',
                            blending_id: '',
                            truck_plate: '',
                            gross_weight: 0,
                            tare_weight: 0,
                            net_weight: 0,
                            photo_url: ''
                        }
                    ]
                });
                setSelectedCustomerName('');
                setSelectedCompany(null);
            }
        };

        loadExistingItems();
    }, [deliveryOrder, open, reset]);

    // Triggered when Sales Order changes: updates company, customer name, and published product name
    useEffect(() => {
        if (!selectedSOId) return;

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

    // File to base64 helper
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // OCR Ticket Scanner handler
    const handleScanTicket = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setScanningIndex(index);
            setError(null);

            try {
                // 1. Upload photo immediately to Supabase Storage
                const fileName = `${Date.now()}_item_${index}.jpg`;
                const filePath = `logistics/${fileName}`;
                const publicUrl = await logisticsService.uploadTicketPhoto(file, filePath);
                setValue(`items.${index}.photo_url`, publicUrl || '');

                // 2. Trigger OCR Function
                const base64 = await fileToBase64(file);
                const { data, error: ocrError } = await supabase.functions.invoke('ocr-ticket', {
                    body: { imageBase64: base64 }
                });

                if (ocrError) throw ocrError;
                if (!data) throw new Error('No data returned from OCR');

                if (data.success === false || data.error) {
                    throw new Error(`OCR Server Error: ${data.error}`);
                }

                if (data.truck_plate) setValue(`items.${index}.truck_plate`, data.truck_plate.toUpperCase());
                if (data.gross_weight) {
                    const grossVal = Number(data.gross_weight);
                    setValue(`items.${index}.gross_weight`, grossVal);
                    const tareVal = watchItems[index]?.tare_weight || 0;
                    setValue(`items.${index}.net_weight`, Math.max(0, grossVal - tareVal));
                }
                if (data.tare_weight) {
                    const tareVal = Number(data.tare_weight);
                    setValue(`items.${index}.tare_weight`, tareVal);
                    const grossVal = watchItems[index]?.gross_weight || 0;
                    setValue(`items.${index}.net_weight`, Math.max(0, grossVal - tareVal));
                }
            } catch (err: any) {
                console.error(err);
                setError(`Gagal memindai tiket Truk #${index + 1}. Silakan input manual.`);
            } finally {
                setScanningIndex(null);
            }
        }
    };

    // Form onSubmit
    const onSubmit = async (data: DeliveryOrderFormValues) => {
        setError(null);
        setSubmitting(true);

        const trimmedProductNameSj = data.product_name_sj?.trim();
        if (!trimmedProductNameSj) {
            setError('Nama Produk (untuk SJ) wajib diisi');
            setSubmitting(false);
            return;
        }

        if (!data.items || data.items.length === 0) {
            setError('Minimal harus menambahkan satu truk/item detail.');
            setSubmitting(false);
            return;
        }

        // Validate detail list items
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            if (!item.internal_product_id) {
                setError(`Produk Internal untuk Truk #${i + 1} wajib dipilih.`);
                setSubmitting(false);
                return;
            }
            if (deliveryType === 'DIRECT' && !item.shipment_id) {
                setError(`Vessel/Tongkang untuk Truk #${i + 1} wajib dipilih.`);
                setSubmitting(false);
                return;
            }
            if (!item.truck_plate?.trim()) {
                setError(`No. Polisi untuk Truk #${i + 1} wajib diisi.`);
                setSubmitting(false);
                return;
            }
            if (Number(item.gross_weight) <= 0) {
                setError(`Gross untuk Truk #${i + 1} harus lebih besar dari 0.`);
                setSubmitting(false);
                return;
            }
        }

        // Fetch SO company id details
        let so = salesOrders.find(item => item.id === data.sales_order_id);
        if (!so && deliveryOrder) {
            // Safe fallback during editing
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

        try {
            const itemsPayload = (data.items || []).map(item => ({
                ...item,
                truck_plate: item.truck_plate?.trim().toUpperCase() || '',
                type_production_id: item.type_production_id || null,
                blending_id: item.blending_id || null
            }));

            const totalGrossWeight = itemsPayload.reduce((sum, item) => sum + (Number(item.gross_weight) || 0), 0);
            const totalTareWeight = itemsPayload.reduce((sum, item) => sum + (Number(item.tare_weight) || 0), 0);
            const totalNetWeight = itemsPayload.reduce((sum, item) => sum + Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0)), 0);

            const headerPayload = {
                sales_order_id: data.sales_order_id,
                published_product_name: trimmedProductNameSj,
                company_id: so.company_id,
                created_by: loggedInProfile?.uuid || null,
                delivery_type: deliveryType,
                truck_plate: deliveryType === 'STOCKPILE' ? data.truck_plate?.trim() || null : null,
                ticket_number: deliveryType === 'STOCKPILE' ? data.ticket_number?.trim() || null : null,
                gross_weight: totalGrossWeight,
                tare_weight: totalTareWeight,
                net_weight: totalNetWeight
            };

            let savedHeader;
            if (deliveryOrder) {
                // Update header and replace detail items
                savedHeader = await deliveryService.updateDeliveryOrderWithItems(deliveryOrder.id, headerPayload, itemsPayload);
            } else {
                // Create header and insert detail items
                savedHeader = await deliveryService.createDeliveryOrderWithItems(headerPayload, itemsPayload);
            }

            onSuccess(savedHeader, itemsPayload);
            onClose();
        } catch (err: any) {
            console.error('Error saving delivery order:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.'); // Mask raw database errors
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate total net weight displayed in the form summary
    const totalNetWeight = watchItems?.reduce((sum, item) => {
        const net = Math.max(0, (Number(item.gross_weight) || 0) - (Number(item.tare_weight) || 0));
        return sum + net;
    }, 0) || 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
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
                    {deliveryOrder ? 'Edit Surat Jalan' : 'Buat Surat Jalan Baru'} ({deliveryType === 'DIRECT' ? 'Pengiriman Langsung' : 'Pengiriman Stockpile'})
                </DialogTitle>
                <DialogContent sx={{ mt: 2, pb: 1, maxHeight: '70vh', overflowY: 'auto' }}>
                    {loadingData || loadingItems ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {(error || Object.keys(errors).length > 0) && (
                                <Grid size={12}>
                                    <Alert severity="error">
                                        {error || "Ada kesalahan pengisian form. Silakan periksa kembali semua inputan Anda."}
                                    </Alert>
                                </Grid>
                            )}

                            {/* Header Section */}
                            <Grid size={12}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                    Informasi Surat Jalan (Header)
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="sales_order_id"
                                    control={control}
                                    rules={{ required: 'Pilih Sales Order wajib diisi' }}
                                    render={({ field }) => (
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <TextField
                                                {...field}
                                                select
                                                label="Sales Order"
                                                fullWidth
                                                error={!!errors.sales_order_id}
                                                helperText={errors.sales_order_id?.message}
                                                disabled={!!deliveryOrder}
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
                                        </Box>
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="Customer"
                                    value={selectedCustomerName}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Otomatis terisi"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
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
                                            disabled={!!deliveryOrder}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="Perusahaan"
                                    value={selectedCompany?.name || ''}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="Otomatis terisi"
                                />
                            </Grid>

                            {deliveryType === 'STOCKPILE' && (
                                <Grid size={12}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        border: '1px dashed',
                                        borderColor: 'primary.main',
                                        bgcolor: mode === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)',
                                        mb: 1
                                    }}>
                                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                                            Informasi Master / Induk (Pengiriman Stockpile)
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name="truck_plate"
                                                    control={control}
                                                    rules={{ required: 'No Polisi (Induk) wajib diisi' }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            label="No Polisi (Induk)"
                                                            fullWidth
                                                            placeholder="e.g. B 1234 XY atau MULTIPLE"
                                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                            error={!!errors.truck_plate}
                                                            helperText={errors.truck_plate?.message}
                                                            size="small"
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name="ticket_number"
                                                    control={control}
                                                    rules={{ required: 'Nomor Ticket (Induk) wajib diisi' }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            label="Nomor Ticket (Induk)"
                                                            fullWidth
                                                            placeholder="e.g. T-12345 atau MULTIPLE"
                                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                            error={!!errors.ticket_number}
                                                            helperText={errors.ticket_number?.message}
                                                            size="small"
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Grid>
                            )}

                            {/* Details Section */}
                            <Grid size={12} sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        Daftar Truk (Detail)
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => append({
                                            internal_product_id: '',
                                            shipment_id: '',
                                            vessel_name: '',
                                            type_production_id: '',
                                            blending_id: '',
                                            truck_plate: '',
                                            gross_weight: 0,
                                            tare_weight: 0,
                                            net_weight: 0,
                                            photo_url: ''
                                        })}
                                        sx={{ borderRadius: '20px', textTransform: 'none' }}
                                    >
                                        Tambah Truk
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>

                            {/* Fields list */}
                            <Grid size={12}>
                                <Stack spacing={3}>
                                    {fields.map((field, index) => (
                                        <DeliveryOrderItemRow
                                            key={field.id}
                                            index={index}
                                            control={control}
                                            setValue={setValue}
                                            getValues={getValues}
                                            watch={watch}
                                            remove={remove}
                                            fieldsLength={fields.length}
                                            internalProducts={internalProducts}
                                            productionTypes={productionTypes}
                                            blendingTypes={blendingTypes}
                                            deliveryType={deliveryType}
                                            mode={mode}
                                            scanningIndex={scanningIndex}
                                            submitting={submitting}
                                            handleScanTicket={handleScanTicket}
                                            errors={errors}
                                        />
                                    ))}
                                </Stack>
                            </Grid>

                            {/* Weight Summary Footer */}
                            <Grid size={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)', p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'primary.main' }}>
                                    <Typography variant="subtitle1" fontWeight="bold">Total Netto Akumulasi:</Typography>
                                    <Typography variant="h6" color="primary" fontWeight="bold">
                                        {totalNetWeight.toLocaleString('id-ID')} Kg ({(totalNetWeight / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT)
                                    </Typography>
                                </Box>
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
                        variant="contained"
                        disabled={submitting || scanningIndex !== null || loadingData || loadingItems}
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
    );
};

export default DeliveryOrderForm;
export type { DeliveryOrderFormValues, DeliveryOrderItemFormValue };
