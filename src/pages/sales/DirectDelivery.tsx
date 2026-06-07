import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    TextField,
    MenuItem,
    Grid,
    Stack,
    Alert,
    CircularProgress,
    Snackbar,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    LinearProgress
} from '@mui/material';
import { PhotoCamera, Image, Save as SaveIcon, Edit as EditIcon, Print as PrintIcon, Add as AddIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useReactToPrint } from 'react-to-print';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { deliveryService } from '../../lib/deliveryService';
import { logisticsService } from '../../lib/logisticsService';
import { masterService } from '../../lib/masterService';
import { inventoryService } from '../../lib/inventoryService';
import { supabase } from '../../lib/supabaseClient';
import type { SalesOrderDetailed, Shipment, DeliveryOrder, MasterCompany, MasterProduct, InventoryCurrent } from '../../types/supabase';
import SuratJalanPrint from './SuratJalanPrint';

interface DirectDeliveryFormValues {
    sales_order_id: string;
    internal_product_id: string;
    shipment_id: string;
    product_name_sj: string;
    truck_plate: string;
    ticket_number: string;
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    notes: string;
}

const DirectDelivery: React.FC = () => {
    const { mode } = useColorMode();
    const { profile: loggedInProfile } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);

    // Lists
    const [salesOrders, setSalesOrders] = useState<SalesOrderDetailed[]>([]);
    const [internalProducts, setInternalProducts] = useState<MasterProduct[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [company, setCompany] = useState<MasterCompany | null>(null);
    const [prevDeliveries, setPrevDeliveries] = useState<any[]>([]);
    const [stocks, setStocks] = useState<InventoryCurrent[]>([]);

    // Modal Control States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDO, setEditingDO] = useState<any | null>(null);

    // States
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Dynamic UI states
    const [customerName, setCustomerName] = useState<string>('');

    // For Print Snapshot
    const [printDO, setPrintDO] = useState<Partial<DeliveryOrder> | null>(null);
    const [printSO, setPrintSO] = useState<SalesOrderDetailed | null>(null);
    const [printCustomProductName, setPrintCustomProductName] = useState<string>('');

    // File scan state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DirectDeliveryFormValues>({
        defaultValues: {
            sales_order_id: '',
            internal_product_id: '',
            shipment_id: '',
            product_name_sj: '',
            truck_plate: '',
            ticket_number: '',
            gross_weight: 0,
            tare_weight: 0,
            net_weight: 0,
            notes: ''
        }
    });

    const selectedSOId = watch('sales_order_id');
    const selectedInternalProductId = watch('internal_product_id');
    const gross = watch('gross_weight') || 0;
    const tare = watch('tare_weight') || 0;

    const selectedStock = useMemo(() => {
        if (!selectedInternalProductId) return null;
        return stocks.find(s => s.product_id === selectedInternalProductId) || null;
    }, [selectedInternalProductId, stocks]);

    // React To Print
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Surat Jalan'
    });

    // Auto-calc Net Weight
    useEffect(() => {
        const net = Math.max(0, gross - tare);
        setValue('net_weight', net);
    }, [gross, tare, setValue]);

    const handleOpenAddModal = () => {
        setEditingDO(null);
        setCustomerName('');
        setSelectedFile(null);
        setPreviewUrl(null);
        reset({
            sales_order_id: '',
            internal_product_id: '',
            shipment_id: '',
            product_name_sj: '',
            truck_plate: '',
            ticket_number: '',
            gross_weight: 0,
            tare_weight: 0,
            net_weight: 0,
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (rowItem: any) => {
        setEditingDO(rowItem);
        setCustomerName(rowItem.customer_name || '');
        setSelectedFile(null);
        setPreviewUrl(rowItem.photo_url || null);
        
        const so = salesOrders.find(item => item.id === rowItem.sales_order_id);
        if (so) {
            setPrintSO(so);
            if (so.company_id) {
                try {
                    const companyInfo = await masterService.getCompanyById(so.company_id);
                    setCompany(companyInfo);
                } catch (err) {
                    console.error('Error fetching company details:', err);
                }
            }
        }

        const internalProductId = rowItem.shipment?.product_id || '';
        if (internalProductId) {
            try {
                const data = await deliveryService.getShipmentsByProduct(internalProductId);
                setShipments(data);
            } catch (err) {
                console.error('Error loading shipments on edit:', err);
            }
        }

        reset({
            sales_order_id: rowItem.sales_order_id || '',
            internal_product_id: internalProductId,
            shipment_id: rowItem.shipment_id || '',
            product_name_sj: rowItem.published_product_name || rowItem.product_name || '',
            truck_plate: rowItem.truck_plate || '',
            ticket_number: rowItem.ticket_number || '',
            gross_weight: rowItem.gross_weight || 0,
            tare_weight: rowItem.tare_weight || 0,
            net_weight: rowItem.net_weight || 0,
            notes: rowItem.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleReprint = async (rowItem: any) => {
        try {
            setError(null);
            let companyInfo = null;
            if (rowItem.company_id) {
                companyInfo = await masterService.getCompanyById(rowItem.company_id);
            }
            setCompany(companyInfo);

            let so = salesOrders.find(item => item.id === rowItem.sales_order_id) || null;
            if (!so) {
                const { data, error: soError } = await supabase
                    .from('sales_orders')
                    .select(`
                        *,
                        customer:master_partners(name),
                        product:master_products(name, sku_code),
                        company:master_companies(name)
                    `)
                    .eq('id', rowItem.sales_order_id)
                    .single();
                if (!soError && data) {
                    so = {
                        ...data,
                        customer_name: data.customer?.name || '-',
                        product_name: data.product_name || data.product?.name || '-',
                        sku_code: data.product?.sku_code || '-',
                        company_name: data.company?.name || '-'
                    };
                }
            }
            
            if (so) {
                setPrintSO(so);
            } else {
                setPrintSO({
                    id: rowItem.sales_order_id,
                    order_no: rowItem.so_number || '-',
                    customer_name: rowItem.customer_name || '-',
                    product_name: rowItem.product_name || '-',
                    qty_ordered: 0,
                    price_per_kg: 0,
                    status: 'COMPLETED',
                    is_completed: true,
                    company_id: rowItem.company_id,
                    customer_id: '',
                    product_id: ''
                });
            }

            setPrintDO(rowItem);
            setPrintCustomProductName(rowItem.published_product_name || rowItem.product_name || '');
            
            setTimeout(() => {
                handlePrint();
            }, 500);
        } catch (err: any) {
            console.error('Error printing document:', err);
            setError('Terjadi kesalahan pada sistem saat mencetak dokumen.');
        }
    };

    // Load initial data
    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [orders, rawProds, currentStocks] = await Promise.all([
                deliveryService.getActiveSalesOrders(),
                deliveryService.getInternalProducts(),
                inventoryService.getCurrentStock()
            ]);
            setSalesOrders(orders);
            setInternalProducts(rawProds);
            setStocks(currentStocks);
        } catch (err: any) {
            console.error('Error loading initial data:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data.');
        } finally {
            setLoading(false);
        }
    };

    const loadStockData = async () => {
        try {
            const currentStocks = await inventoryService.getCurrentStock();
            setStocks(currentStocks);
        } catch (err: any) {
            console.error('Error loading stock details:', err);
        }
    };

    const loadDeliveries = async () => {
        try {
            setTableLoading(true);
            const data = await deliveryService.getDeliveryOrdersDetailed();
            setPrevDeliveries(data);
        } catch (err: any) {
            console.error('Error loading delivery history:', err);
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
        loadDeliveries();
    }, []);

    // Step 1: Sales Order Selection Effect
    useEffect(() => {
        if (!selectedSOId) {
            setCustomerName('');
            setCompany(null);
            setValue('product_name_sj', '');
            return;
        }

        const so = salesOrders.find(item => item.id === selectedSOId);
        if (so) {
            setCustomerName(so.customer_name || '-');
            setValue('product_name_sj', so.product_name || '');
            setPrintSO(so);

            // Fetch company details
            const fetchCompany = async () => {
                if (so.company_id) {
                    try {
                        const companyInfo = await masterService.getCompanyById(so.company_id);
                        setCompany(companyInfo);
                    } catch (err) {
                        console.error('Error fetching company details:', err);
                    }
                } else {
                    setCompany(null);
                }
            };
            fetchCompany();
        }
    }, [selectedSOId, salesOrders, setValue]);

    // Step 2 & 3: Internal Product selection triggers Vessel fetch (unfiltered by status)
    useEffect(() => {
        if (!selectedInternalProductId) {
            setShipments([]);
            setValue('shipment_id', '');
            return;
        }

        const fetchVessels = async () => {
            try {
                const data = await deliveryService.getShipmentsByProduct(selectedInternalProductId);
                setShipments(data);
                if (data.length === 1) {
                    setValue('shipment_id', data[0].id);
                } else {
                    setValue('shipment_id', '');
                }
            } catch (err: any) {
                console.error('Error loading shipments:', err);
            }
        };
        fetchVessels();
    }, [selectedInternalProductId, setValue]);

    // File to base64 helper
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // OCR Scan handler
    const handleScanTicket = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));

            setScanning(true);
            setError(null);

            try {
                const base64 = await fileToBase64(file);
                const { data, error } = await supabase.functions.invoke('ocr-ticket', {
                    body: { imageBase64: base64 }
                });

                if (error) throw error;
                if (!data) throw new Error('No data returned from OCR');

                if (data.success === false || data.error) {
                    throw new Error(`OCR Server Error: ${data.error}`);
                }

                if (data.truck_plate) setValue('truck_plate', data.truck_plate.toUpperCase());
                if (data.ticket_number) setValue('ticket_number', String(data.ticket_number));
                if (data.gross_weight) setValue('gross_weight', Number(data.gross_weight));
                if (data.tare_weight) setValue('tare_weight', Number(data.tare_weight));

                setSuccessMsg('OCR Scanned Successfully');
            } catch (err: any) {
                console.error(err);
                setError('Failed to scan ticket. Please input weighing details manually.');
            } finally {
                setScanning(false);
            }
        }
    };

    const onSubmit = async (data: DirectDeliveryFormValues) => {
        setError(null);
        setSubmitting(true);

        const trimmedTruckPlate = data.truck_plate?.trim().toUpperCase() || '';
        const trimmedTicketNumber = data.ticket_number?.trim() || '';
        const trimmedProductNameSj = data.product_name_sj?.trim() || '';

        if (!trimmedTruckPlate || !trimmedTicketNumber || !trimmedProductNameSj) {
            setError('Plat Truk, Nomor Tiket, dan Nama Produk Surat Jalan wajib diisi');
            setSubmitting(false);
            return;
        }

        let so = salesOrders.find(item => item.id === data.sales_order_id);
        if (!so && editingDO && editingDO.sales_order_id === data.sales_order_id) {
            so = {
                id: editingDO.sales_order_id,
                order_no: editingDO.so_number || '-',
                customer_name: editingDO.customer_name || '-',
                product_name: editingDO.product_name || '-',
                qty_ordered: 0,
                price_per_kg: 0,
                status: editingDO.sales_order?.status || 'COMPLETED',
                is_completed: editingDO.sales_order?.is_completed || true,
                company_id: editingDO.company_id,
                customer_id: '',
                product_id: ''
            };
        }

        const selectedShipment = shipments.find(s => s.id === data.shipment_id);

        if (!so) {
            setError('Sales Order tidak valid');
            setSubmitting(false);
            return;
        }

        try {
            // 1. Upload Photo (Optional)
            let publicUrl: string | null = editingDO ? editingDO.photo_url : null;
            if (selectedFile) {
                const fileName = `${Date.now()}_${trimmedTicketNumber}.jpg`;
                const filePath = `logistics/${fileName}`;
                publicUrl = await logisticsService.uploadTicketPhoto(selectedFile, filePath);
            }

            if (editingDO) {
                // UPDATE FLOW
                const payload: Partial<DeliveryOrder> = {
                    sales_order_id: data.sales_order_id,
                    internal_product_id: data.internal_product_id,
                    truck_plate: trimmedTruckPlate,
                    ticket_number: trimmedTicketNumber,
                    gross_weight: data.gross_weight,
                    tare_weight: data.tare_weight,
                    net_weight: data.net_weight,
                    company_id: so.company_id,
                    shipment_id: data.shipment_id || null,
                    vessel_name: selectedShipment?.vessel_name || null,
                    photo_url: publicUrl,
                    published_product_name: trimmedProductNameSj
                };

                await deliveryService.updateDeliveryOrder(editingDO.id, payload);
                setSuccessMsg(`Surat Jalan ${editingDO.sj_number} berhasil diperbarui!`);
                setIsModalOpen(false);
                loadDeliveries();
                loadStockData();
            } else {
                // INSERT FLOW
                const sjNumber = await deliveryService.generateSjNumber(so.company_id || '');

                const payload: Partial<DeliveryOrder> = {
                    sales_order_id: data.sales_order_id,
                    internal_product_id: data.internal_product_id,
                    truck_plate: trimmedTruckPlate,
                    ticket_number: trimmedTicketNumber,
                    gross_weight: data.gross_weight,
                    tare_weight: data.tare_weight,
                    net_weight: data.net_weight,
                    company_id: so.company_id,
                    shipment_id: data.shipment_id || null,
                    vessel_name: selectedShipment?.vessel_name || null,
                    sj_number: sjNumber,
                    photo_url: publicUrl,
                    created_by: loggedInProfile?.uuid || null,
                    published_product_name: trimmedProductNameSj
                };

                const savedOrder = await deliveryService.createDeliveryOrder(payload);

                // Set state snapshots for printing
                setPrintDO(savedOrder);
                setPrintCustomProductName(trimmedProductNameSj);
                setSuccessMsg(`Surat Jalan ${sjNumber} berhasil disimpan!`);
                setIsModalOpen(false);

                // Trigger Print after states are set
                setTimeout(() => {
                    handlePrint();
                    loadDeliveries(); // Refresh the table list
                    loadStockData(); // Refresh the stock numbers
                }, 500);
            }

            setSelectedFile(null);
            setPreviewUrl(null);

        } catch (err: any) {
            console.error('Error saving delivery order:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setSubmitting(false);
        }
    };

    // Material React Table columns
    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: 'sj_number',
            header: 'No. Surat Jalan',
            size: 150,
            Cell: ({ cell }) => <span style={{ fontWeight: 'bold' }}>{cell.getValue<string>()}</span>
        },
        {
            accessorKey: 'so_number',
            header: 'No. Penjualan',
            size: 150,
        },
        {
            accessorKey: 'company_name',
            header: 'Perusahaan',
            size: 160,
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            size: 160,
        },
        {
            accessorKey: 'product_name',
            header: 'Nama Produk',
            size: 180,
        },
        {
            accessorKey: 'net_weight',
            header: 'Netto',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: prevDeliveries,
        enableRowActions: true,
        positionActionsColumn: 'last',
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: 'Aksi',
                size: 100,
            },
        },
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenEditModal(row.original)} size="small" color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Cetak Surat Jalan">
                    <IconButton onClick={() => handleReprint(row.original)} size="small" color="secondary">
                        <PrintIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
        state: {
            isLoading: tableLoading,
            showProgressBars: tableLoading,
        },
        muiTablePaperProps: {
            elevation: 0,
            sx: {
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                background: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.4)'
                    : 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                overflow: 'hidden',
            },
        },
        muiTableBodyRowProps: () => ({
            sx: {
                backgroundColor: 'transparent',
                '&:hover': {
                    backgroundColor: mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05) !important'
                        : 'rgba(0, 0, 0, 0.02) !important',
                    transform: 'scale(1.001)',
                    transition: 'all 0.2s',
                    zIndex: 1,
                },
            },
        }),
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.6)'
                    : 'rgba(240, 247, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                color: mode === 'dark' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
                fontSize: '0.85rem',
            },
        },
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {loading && <LinearProgress sx={{ mb: 2, borderRadius: '4px' }} />}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Pengiriman Langsung
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddModal}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
                    }}
                >
                    Tambah Pengiriman
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Previous Deliveries History Table */}
            <Box sx={{ mb: 4 }}>
                <MaterialReactTable table={table} />
            </Box>

            {/* Dialog Form Component */}
            <Dialog 
                open={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                fullWidth 
                maxWidth="lg"
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
                        Detail Pengiriman
                    </DialogTitle>
                    <DialogContent sx={{ mt: 2, pb: 1 }}>
                        <Grid container spacing={3}>
                            {/* Form Input Section */}
                            <Grid size={{ xs: 12, md: 7 }}>
                                <Grid container spacing={3}>
                                    {/* Row 1: Sales Order Info */}
                                    <Grid size={12}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                            Informasi Sales Order & Produk
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="sales_order_id"
                                            control={control}
                                            rules={{ required: 'Pilih Sales Order wajib diisi' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Pilih Sales Order"
                                                    fullWidth
                                                    error={!!errors.sales_order_id}
                                                    helperText={errors.sales_order_id?.message}
                                                    disabled={!!editingDO}
                                                >
                                                    {salesOrders.map(so => (
                                                        <MenuItem key={so.id} value={so.id}>
                                                            {so.order_no} - {so.customer_name} ({so.product_name})
                                                        </MenuItem>
                                                    ))}
                                                    {editingDO && !salesOrders.some(so => so.id === editingDO.sales_order_id) && (
                                                        <MenuItem key={editingDO.sales_order_id} value={editingDO.sales_order_id}>
                                                            {editingDO.so_number} - {editingDO.customer_name} ({editingDO.product_name}) [Selesai]
                                                        </MenuItem>
                                                    )}
                                                </TextField>
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            label="Customer"
                                            value={customerName}
                                            fullWidth
                                            disabled
                                            InputLabelProps={{ shrink: true }}
                                            placeholder="Otomatis terisi"
                                        />
                                    </Grid>

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
                                                />
                                            )}
                                        />
                                    </Grid>

                                    {/* Row 2: Product & Vessel Selection */}
                                    <Grid size={12} sx={{ mt: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                            Pemuatan Vessel / Tongkang
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="internal_product_id"
                                            control={control}
                                            rules={{ required: 'Produk Internal (Raw) wajib diisi' }}
                                            render={({ field }) => (
                                                <Box>
                                                    <TextField
                                                        {...field}
                                                        select
                                                        label="Produk Internal (Raw)"
                                                        fullWidth
                                                        error={!!errors.internal_product_id}
                                                        helperText={errors.internal_product_id?.message}
                                                    >
                                                        {internalProducts.map(p => (
                                                            <MenuItem key={p.id} value={p.id}>
                                                                {p.name}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                    {selectedStock && (
                                                        <Box sx={{ mt: 1, px: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                                                                Stok Saat Ini:
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${selectedStock.current_stock_kg.toLocaleString('id-ID')} Kg (${(selectedStock.current_stock_kg / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT)`}
                                                                color={selectedStock.current_stock_kg > 0 ? "success" : "error"}
                                                                variant="outlined"
                                                                sx={{ fontWeight: 'bold', height: '20px', fontSize: '0.75rem' }}
                                                            />
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="shipment_id"
                                            control={control}
                                            rules={{ required: 'Pilih Vessel/Tongkang wajib diisi' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Pilih Vessel/Tongkang"
                                                    fullWidth
                                                    disabled={!selectedInternalProductId || shipments.length === 0}
                                                    error={!!errors.shipment_id}
                                                    helperText={errors.shipment_id ? errors.shipment_id.message : (shipments.length === 0 && selectedInternalProductId ? 'Tidak ada vessel aktif dengan produk ini' : '')}
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

                                    {/* Row 3: Weighbridge Data */}
                                    <Grid size={12} sx={{ mt: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                            Data Timbangan / Weighbridge
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="truck_plate"
                                            control={control}
                                            rules={{ required: 'No. Polisi wajib diisi' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="No. Polisi (Truck)"
                                                    fullWidth
                                                    placeholder="e.g. B 1234 XY"
                                                    error={!!errors.truck_plate}
                                                    helperText={errors.truck_plate?.message}
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="ticket_number"
                                            control={control}
                                            rules={{ required: 'No. Tiket Timbangan wajib diisi' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="No. Tiket Timbangan"
                                                    fullWidth
                                                    placeholder="Masukkan nomor tiket..."
                                                    error={!!errors.ticket_number}
                                                    helperText={errors.ticket_number?.message}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Controller
                                            name="gross_weight"
                                            control={control}
                                            rules={{ required: 'Gross wajib diisi', min: { value: 1, message: 'Gross harus > 0' } }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Gross (Kg)"
                                                    type="number"
                                                    fullWidth
                                                    error={!!errors.gross_weight}
                                                    helperText={errors.gross_weight?.message}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Controller
                                            name="tare_weight"
                                            control={control}
                                            rules={{ required: 'Tare wajib diisi', min: { value: 0, message: 'Tare tidak boleh negatif' } }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Tare (Kg)"
                                                    type="number"
                                                    fullWidth
                                                    error={!!errors.tare_weight}
                                                    helperText={errors.tare_weight?.message}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Box sx={{ bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', p: 1.5, borderRadius: 2, textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>NETTO (KG)</Typography>
                                            <Typography variant="h5" color="primary" fontWeight="bold">
                                                {(gross - tare).toLocaleString('id-ID')}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={12}>
                                        <TextField
                                            label="No. Surat Jalan"
                                            value={editingDO ? editingDO.sj_number : "Otomatis dibuat"}
                                            fullWidth
                                            disabled
                                            InputLabelProps={{ shrink: true }}
                                            placeholder="Otomatis dibuat"
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* OCR & Photo Attachment Section */}
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                        OCR Scan & Lampiran Tiket
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                        Gunakan fitur scan timbangan untuk mempercepat input data dengan mengambil foto tiket timbangan.
                                    </Typography>

                                    <Stack spacing={2} sx={{ mb: 3 }}>
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={scanning ? <CircularProgress size={20} /> : <PhotoCamera />}
                                            fullWidth
                                            color="primary"
                                            sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2, borderRadius: '8px' }}
                                            disabled={scanning || submitting}
                                        >
                                            {scanning ? 'Menganalisis...' : 'Ambil Foto Tiket (Kamera)'}
                                            <input
                                                hidden
                                                accept="image/*"
                                                type="file"
                                                onChange={handleScanTicket}
                                                {...({ capture: 'environment' } as any)}
                                            />
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={scanning ? <CircularProgress size={20} /> : <Image />}
                                            fullWidth
                                            color="secondary"
                                            sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2, borderRadius: '8px' }}
                                            disabled={scanning || submitting}
                                        >
                                            {scanning ? 'Menganalisis...' : 'Pilih dari Galeri'}
                                            <input
                                                hidden
                                                accept="image/*"
                                                type="file"
                                                onChange={handleScanTicket}
                                            />
                                        </Button>
                                    </Stack>

                                    {previewUrl ? (
                                        <Box sx={{ borderRadius: 2, overflow: 'hidden', flexGrow: 1, display: 'flex', justifyContent: 'center', bgcolor: '#000', minHeight: '180px', maxHeight: '280px' }}>
                                            <img src={previewUrl} alt="Preview Tiket" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        </Box>
                                    ) : (
                                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', border: '1px dashed rgba(0, 0, 0, 0.1)', borderRadius: '8px', bgcolor: 'action.hover' }}>
                                            <Image color="disabled" sx={{ fontSize: 48, mb: 1 }} />
                                            <Typography variant="caption" color="textSecondary">Belum ada foto terpilih</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2, gap: 1 }}>
                        <Button 
                            onClick={() => setIsModalOpen(false)} 
                            variant="outlined" 
                            color="inherit"
                            sx={{ borderRadius: '20px', textTransform: 'none' }}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting || scanning}
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

            {/* Hidden Printing Area */}
            <Box sx={{ display: 'none', displayPrint: 'block' }}>
                <SuratJalanPrint
                    ref={printRef}
                    deliveryOrder={printDO}
                    salesOrder={printSO}
                    company={company}
                    customProductName={printCustomProductName}
                />
            </Box>

            <Snackbar
                open={!!successMsg}
                autoHideDuration={3000}
                onClose={() => setSuccessMsg(null)}
                message={successMsg}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
};

export default DirectDelivery;
