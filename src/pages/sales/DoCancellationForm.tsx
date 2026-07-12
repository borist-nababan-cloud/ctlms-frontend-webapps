import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    MenuItem,
    CircularProgress,
    Alert,
    Typography,
    Divider,
    Autocomplete,
    Stepper,
    Step,
    StepLabel,
    Card,
    CardContent
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { doCancellationService } from '../../lib/doCancellationService';
import { masterService } from '../../lib/masterService';
import { salesService } from '../../lib/salesService';
import type { DoCancellationRequestType } from '../../types/supabase';

interface DoCancellationFormValues {
    do_id: string;
    request_type: DoCancellationRequestType;
    truck_plate: string;
    transporter_id: string;
    sales_order_id: string;
    return_product_id: string;
    return_qty: number;
    reason: string;
}

interface DoCancellationFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const REQUEST_TYPES: DoCancellationRequestType[] = [
    'Ganti Kendaraan',
    'Ganti Sales Order',
    'Pengembalian Stok (Per Item)',
    'Pengembalian Stok (Total)'
];

const steps = ['Pilih Surat Jalan', 'Pilih Jenis Permintaan', 'Detail Permintaan'];

const DoCancellationForm: React.FC<DoCancellationFormProps> = ({ open, onClose, onSuccess }) => {
    const { profile } = useAuth();
    
    const [activeStep, setActiveStep] = useState(0);

    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
    const [transporters, setTransporters] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    
    const [loadingData, setLoadingData] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { control, handleSubmit, watch, reset, trigger, formState: { errors } } = useForm<DoCancellationFormValues>({
        defaultValues: {
            do_id: '',
            request_type: 'Ganti Kendaraan',
            truck_plate: '',
            transporter_id: '',
            sales_order_id: '',
            return_product_id: '',
            return_qty: 0,
            reason: ''
        },
        mode: 'onChange' // Validate on change so trigger() works reliably
    });

    const requestType = watch('request_type');
    const selectedDoId = watch('do_id');
    const selectedSOId = watch('sales_order_id');
    const selectedDO = deliveryOrders.find(d => d.id === selectedDoId);
    const selectedSO = salesOrders.find(so => so.id === selectedSOId);
    
    // Reset form when opened
    useEffect(() => {
        if (open) {
            reset();
            setActiveStep(0);
            setError(null);
            fetchDropdownData();
        }
    }, [open, reset]);

    const fetchDropdownData = async () => {
        try {
            setLoadingData(true);
            const userRole = profile?.user_role;
            const companyId = profile?.company_id;

            const [dos, trans, sos, prods] = await Promise.all([
                doCancellationService.getDeliveryOrders(userRole !== 8 && userRole !== 1 ? companyId : null),
                masterService.getPartners(null, 8), // Fetch all partners, filter below
                salesService.getSalesOrders(), // Might need to ensure cross-company
                masterService.getProducts()
            ]);

            setDeliveryOrders(dos || []);
            setTransporters((trans || []).filter(p => p.type === 'TRANSPORTER'));
            setSalesOrders(sos || []);
            setProducts(prods || []);
        } catch (err: any) {
            console.error('Error fetching dropdown data:', err);
            setError('Gagal memuat data formulir.');
        } finally {
            setLoadingData(false);
        }
    };

    const handleNext = async () => {
        let isStepValid = false;
        if (activeStep === 0) {
            isStepValid = await trigger('do_id');
        } else if (activeStep === 1) {
            isStepValid = await trigger('request_type');
        }

        if (isStepValid) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const onSubmit = async (data: DoCancellationFormValues) => {
        // Validation handled by form submit natively for step 2
        try {
            setSubmitting(true);
            setError(null);
            
            if (!profile?.company_id) {
                throw new Error("Company ID tidak ditemukan pada sesi Anda.");
            }

            // Clean payload based on type
            const payload: any = {
                company_id: profile.company_id,
                do_id: data.do_id,
                request_type: data.request_type,
                reason: data.reason,
                created_by: profile.uuid
            };

            if (data.request_type === 'Ganti Kendaraan') {
                payload.truck_plate = data.truck_plate;
                payload.transporter_id = data.transporter_id || null;
            } else if (data.request_type === 'Ganti Sales Order') {
                payload.sales_order_id = data.sales_order_id;
            } else if (data.request_type === 'Pengembalian Stok (Per Item)') {
                payload.return_product_id = data.return_product_id;
                payload.return_qty = data.return_qty;
            }

            await doCancellationService.createRequest(payload);
            onSuccess();
        } catch (err: any) {
            console.error('Error submitting form:', err);
            
            // Detect 403 Forbidden or RLS restriction errors
            if (err?.code === '42501' || err?.message?.includes('403') || err?.message?.includes('RLS')) {
                setError('Akses ditolak (403 Forbidden): Anda tidak memiliki izin untuk menyimpan data lintas-perusahaan ini karena restriksi RLS.');
            } else {
                setError('Terjadi kesalahan pada sistem saat memproses data.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="md" fullWidth>
            <DialogTitle>
                <Typography variant="h6" component="div" fontWeight="bold">
                    Buat Permintaan Pembatalan/Perubahan
                </Typography>
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent dividers sx={{ minHeight: '300px' }}>
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                    
                    {loadingData ? (
                        <Grid container justifyContent="center" p={3}>
                            <CircularProgress />
                        </Grid>
                    ) : (
                        <Grid container spacing={3}>
                            {/* STEP 1 */}
                            {activeStep === 0 && (
                                <Grid size={{ xs: 12 }}>
                                    <Controller
                                        name="do_id"
                                        control={control}
                                        rules={{ required: 'Surat Jalan wajib dipilih' }}
                                        render={({ field: { onChange, value, ref } }) => (
                                            <Autocomplete
                                                options={deliveryOrders}
                                                getOptionLabel={(option) => option.sj_number || ''}
                                                value={deliveryOrders.find(d => d.id === value) || null}
                                                onChange={(_, newValue) => onChange(newValue ? newValue.id : '')}
                                                isOptionEqualToValue={(option, val) => option.id === val.id}
                                                renderOption={(props, option) => {
const { key, ...rest } = props;
return <li key={key || option.id} {...rest} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                                                        <Typography variant="body1">{option.sj_number}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Customer: {option.customer_name} | Tgl: {new Date(option.created_at).toLocaleDateString('id-ID')}
                                                        </Typography>
                                                    </li>;
}}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        inputRef={ref}
                                                        label="Pilih Surat Jalan"
                                                        error={!!errors.do_id}
                                                        helperText={errors.do_id?.message}
                                                        placeholder="Ketik untuk mencari..."
                                                    />
                                                )}
                                            />
                                        )}
                                    />
                                    
                                    {selectedDO && (
                                        <Card variant="outlined" sx={{ mt: 3, bgcolor: 'background.default' }}>
                                            <CardContent>
                                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                                    Informasi Surat Jalan
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid size={{ xs: 6, sm: 2 }}>
                                                        <Typography variant="caption" color="textSecondary">Nomor Surat Jalan</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{selectedDO.sj_number}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 6, sm: 2 }}>
                                                        <Typography variant="caption" color="textSecondary">No. PO</Typography>
                                                        <Typography variant="body2">{selectedDO.po_number || '-'}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 6, sm: 2 }}>
                                                        <Typography variant="caption" color="textSecondary">Tanggal DO</Typography>
                                                        <Typography variant="body2">{new Date(selectedDO.created_at).toLocaleDateString('id-ID')}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 6, sm: 2 }}>
                                                        <Typography variant="caption" color="textSecondary">Total Netto</Typography>
                                                        <Typography variant="body2">{selectedDO.net_weight?.toLocaleString('id-ID')} Kg</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 6, sm: 2 }}>
                                                        <Typography variant="caption" color="textSecondary">Customer</Typography>
                                                        <Typography variant="body2">{selectedDO.customer_name}</Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    )}
                                </Grid>
                            )}

                            {/* STEP 2 */}
                            {activeStep === 1 && (
                                <Grid size={{ xs: 12 }}>
                                    <Controller
                                        name="request_type"
                                        control={control}
                                        rules={{ required: 'Jenis permintaan wajib dipilih' }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                select
                                                fullWidth
                                                label="Jenis Permintaan"
                                                error={!!errors.request_type}
                                                helperText={errors.request_type?.message}
                                            >
                                                {REQUEST_TYPES.map(type => (
                                                    <MenuItem key={type} value={type}>
                                                        {type}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                            )}

                            {/* STEP 3 */}
                            {activeStep === 2 && (
                                <>
                                    {/* Conditional Fields: Ganti Kendaraan */}
                                    {requestType === 'Ganti Kendaraan' && (
                                        <>
                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                <Controller
                                                    name="truck_plate"
                                                    control={control}
                                                    rules={{ required: 'No Polisi Baru wajib diisi' }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            fullWidth
                                                            label="No Polisi Baru"
                                                            error={!!errors.truck_plate}
                                                            helperText={errors.truck_plate?.message}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                <Controller
                                                    name="transporter_id"
                                                    control={control}
                                                    render={({ field: { onChange, value, ref } }) => (
                                                        <Autocomplete
                                                            options={transporters}
                                                            getOptionLabel={(option) => `[${option.company_name || 'Global'}] - ${option.name}`}
                                                            value={transporters.find(t => t.id === value) || null}
                                                            onChange={(_, newValue) => onChange(newValue ? newValue.id : '')}
                                                            isOptionEqualToValue={(option, val) => option.id === val.id}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    inputRef={ref}
                                                                    label="Transporter Baru (Opsional)"
                                                                    placeholder="Pilih Transporter..."
                                                                    sx={{ minWidth: 250 }}
                                                                />
                                                            )}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </>
                                    )}

                                    {/* Conditional Fields: Ganti Sales Order */}
                                    {requestType === 'Ganti Sales Order' && (
                                        <Grid size={{ xs: 12 }}>
                                            <Controller
                                                name="sales_order_id"
                                                control={control}
                                                rules={{ required: 'Sales Order Baru wajib dipilih' }}
                                                render={({ field: { onChange, value, ref } }) => (
                                                    <Autocomplete
                                                        options={salesOrders.filter(so => !so.is_completed)}
                                                        getOptionLabel={(option) => `[${option.company_name || 'Global'}] - ${option.po_number || option.order_no} - ${option.customer_name} - ${option.product_name}`}
                                                        value={salesOrders.find(so => so.id === value) || null}
                                                        onChange={(_, newValue) => onChange(newValue ? newValue.id : '')}
                                                        isOptionEqualToValue={(option, val) => option.id === val.id}
                                                        renderOption={(props, option) => {
                                                            const { key, ...optionProps } = props as any;
                                                            return (
                                                                <li key={key} {...optionProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                                                                    <Typography variant="body1" fontWeight="bold">
                                                                        [{option.company_name || 'Global'}] {option.po_number || option.order_no}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Customer: {option.customer_name} | Product: {option.product_name}
                                                                    </Typography>
                                                                </li>
                                                            );
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                inputRef={ref}
                                                                fullWidth
                                                                label="Pilih Sales Order Baru"
                                                                error={!!errors.sales_order_id}
                                                                helperText={errors.sales_order_id?.message}
                                                                placeholder="Ketik untuk mencari..."
                                                            />
                                                        )}
                                                    />
                                                )}
                                            />
                                            {selectedSO && (
                                                <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.default' }}>
                                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                                            Perhatian: Mengganti Sales Order lintas perusahaan akan membuat nomor Surat Jalan baru otomatis.
                                                        </Alert>
                                                        <Typography variant="subtitle2" color="primary" gutterBottom>
                                                            Informasi Sales Order Baru
                                                        </Typography>
                                                        <Grid container spacing={2}>
                                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                                <Typography variant="caption" color="textSecondary">Perusahaan Baru</Typography>
                                                                <Typography variant="body2" fontWeight="bold">{selectedSO.company_name || '-'}</Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                                <Typography variant="caption" color="textSecondary">Nomor PO / SO</Typography>
                                                                <Typography variant="body2" fontWeight="bold">{selectedSO.po_number || selectedSO.order_no}</Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                                <Typography variant="caption" color="textSecondary">Customer Baru</Typography>
                                                                <Typography variant="body2">{selectedSO.customer_name}</Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Grid>
                                    )}

                                    {/* Conditional Fields: Pengembalian Stok (Per Item) */}
                                    {requestType === 'Pengembalian Stok (Per Item)' && (
                                        <>
                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                <Controller
                                                    name="return_product_id"
                                                    control={control}
                                                    rules={{ required: 'Produk wajib dipilih' }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            select
                                                            fullWidth
                                                            label="Produk yang Dikembalikan"
                                                            error={!!errors.return_product_id}
                                                            helperText={errors.return_product_id?.message}
                                                        >
                                                            {products.map(p => (
                                                                <MenuItem key={p.id} value={p.id}>
                                                                    [{p.company_name || 'Global'}] - {p.name}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 2 }}>
                                                <Controller
                                                    name="return_qty"
                                                    control={control}
                                                    rules={{ required: 'Qty wajib diisi', min: { value: 1, message: 'Minimal 1' } }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            type="number"
                                                            fullWidth
                                                            label="Qty (Kg)"
                                                            error={!!errors.return_qty}
                                                            helperText={errors.return_qty?.message}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </>
                                    )}
                                    
                                    {/* All requests should have an optional/mandatory reason */}
                                    <Grid size={{ xs: 12 }}>
                                        <Divider sx={{ my: 2 }} />
                                        <Controller
                                            name="reason"
                                            control={control}
                                            rules={{ required: 'Alasan permintaan wajib diisi' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    label="Alasan Permintaan"
                                                    error={!!errors.reason}
                                                    helperText={errors.reason?.message}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
                    <Button onClick={onClose} disabled={submitting} color="inherit">
                        Tutup
                    </Button>
                    <div>
                        {activeStep > 0 && (
                            <Button onClick={handleBack} disabled={submitting} sx={{ mr: 1 }}>
                                Kembali
                            </Button>
                        )}
                        {activeStep < steps.length - 1 ? (
                            <Button 
                                variant="contained" 
                                onClick={handleNext}
                                disabled={loadingData || (activeStep === 0 && !selectedDoId)}
                            >
                                Lanjut
                            </Button>
                        ) : (
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary"
                                disabled={submitting || loadingData}
                            >
                                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Kirim Permintaan'}
                            </Button>
                        )}
                    </div>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default DoCancellationForm;
