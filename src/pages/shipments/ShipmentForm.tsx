import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    MenuItem,
    Alert,
    Grid,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { shipmentService } from '../../lib/shipmentService';
import { masterService } from '../../lib/masterService';
import type { Shipment, MasterPartner, MasterProduct } from '../../types/supabase';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

// Helper to format currency/numbers with thousands separators
const formatNumberStr = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
};

interface ShipmentFormValues extends Omit<Partial<Shipment>, 'jenis_batu'> {
    jenis_batu: 'High' | 'Medium' | 'Low' | '';
}

interface ShipmentFormProps {
    shipmentId: string | null;
    onSuccess: (message?: string) => void;
    onClose: () => void;
}

const ShipmentForm: React.FC<ShipmentFormProps> = ({ shipmentId, onSuccess, onClose }) => {
    const { t } = useTranslation();
    const { profile: loggedInProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<MasterPartner[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [isOriginallyCompleted, setIsOriginallyCompleted] = useState(false);
    const [companyName, setCompanyName] = useState<string>('');

    useEffect(() => {
        const fetchCompany = async () => {
            if (loggedInProfile?.company_id) {
                try {
                    const company = await masterService.getCompanyById(loggedInProfile.company_id);
                    if (company) {
                        setCompanyName(company.name);
                    }
                } catch (err: any) {
                    console.error('Error fetching company details:', err);
                }
            }
        };
        fetchCompany();
    }, [loggedInProfile]);

    const isEditMode = Boolean(shipmentId);
    const isLocked = isEditMode && isOriginallyCompleted;

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<ShipmentFormValues>({
        defaultValues: {
            invoice_no: '',
            supplier_id: '',
            product_id: '',
            vessel_name: '',
            asal_batu: '',
            quantity: 0,
            jenis_batu: '',
            eta: new Date().toISOString().split('T')[0],
            is_completed: false,
            harga: 0,
            ppn_tax: 0,
            pph_tax: 0,
            disc: 0,
            qty_loading: 0,
            issue_date: new Date().toISOString().split('T')[0],
            loading_date: new Date().toISOString().split('T')[0]
        }
    });

    const isCompletedChecked = watch('is_completed') || false;
    const isFormDisabled = isCompletedChecked || isLocked;

    // Watch values for dynamic calculation
    const qty = watch('quantity') || 0;
    const price = watch('harga') || 0;
    const subtotal = qty * price;
    const ppn = watch('ppn_tax') || 0;
    const pph = watch('pph_tax') || 0;
    const discount = watch('disc') || 0;
    const finalPayment = subtotal + ppn + pph - discount;

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [allPartners, allProducts] = await Promise.all([
                    masterService.getPartners(),
                    masterService.getProducts()
                ]);
                setSuppliers(allPartners.filter(p => p.type === 'SUPPLIER'));
                setProducts(allProducts.filter(p => p.type === 'INTERNAL_RAW'));

                if (isEditMode && shipmentId) {
                    const shipment = await shipmentService.getShipmentById(shipmentId);
                    if (shipment) {
                        setValue('invoice_no', shipment.invoice_no || '');
                        setValue('supplier_id', shipment.supplier_id || '');
                        setValue('product_id', shipment.product_id || '');
                        setValue('vessel_name', shipment.vessel_name || '');
                        setValue('asal_batu', shipment.asal_batu || '');
                        setValue('quantity', Number(shipment.quantity) || 0);
                        setValue('jenis_batu', shipment.jenis_batu || '');
                        setValue('eta', shipment.eta || '');
                        setValue('is_completed', shipment.is_completed || false);
                        setValue('harga', Number(shipment.harga) || 0);
                        setValue('ppn_tax', Number(shipment.ppn_tax) || 0);
                        setValue('pph_tax', Number(shipment.pph_tax) || 0);
                        setValue('disc', Number(shipment.disc) || 0);
                        setValue('qty_loading', Number(shipment.qty_loading) || 0);
                        setValue('issue_date', shipment.issue_date || '');
                        setValue('loading_date', shipment.loading_date || '');
                        setIsOriginallyCompleted(shipment.is_completed || false);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        loadMasterData();
    }, [shipmentId, isEditMode, setValue]);

    const onSubmit = async (data: ShipmentFormValues) => {
        if (isLocked) {
            setError('Data ini sudah dikunci (Status Selesai) dan tidak dapat diubah.');
            return;
        }

        setLoading(true);
        setError(null);

        // Sanitize data and apply defaults
        const savePayload: Partial<Shipment> = {
            ...data,
            company_id: loggedInProfile?.company_id || null,
            ppn_tax: data.ppn_tax || 0,
            pph_tax: data.pph_tax || 0,
            disc: data.disc || 0,
            harga: data.harga || 0,
            quantity: data.quantity || 0,
            jenis_batu: data.jenis_batu === '' ? null : data.jenis_batu
        };

        // Explicitly exclude status, is_completed, created_by, and created_at from initial save/update payload
        delete savePayload.status;
        delete savePayload.is_completed;
        delete savePayload.created_by;
        delete savePayload.created_at;

        try {
            let successMessage = 'Pengiriman berhasil disimpan';
            const shouldComplete = Boolean(data.is_completed);

            if (isEditMode && shipmentId) {
                // 1. Always update the shipment first without status or is_completed columns
                await shipmentService.updateShipment(shipmentId, savePayload);

                // 2. If completed checkbox is checked and it wasn't previously completed, trigger RPC
                if (shouldComplete && !isOriginallyCompleted) {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('complete_shipment', {
                        p_shipment_id: shipmentId
                    });

                    if (rpcError) {
                        throw new Error(rpcError.message);
                    }
                    if (rpcData && rpcData.success === false) {
                        throw new Error(rpcData.message);
                    }
                    successMessage = 'Stok berhasil ditambahkan';
                }
            } else {
                // 1. Create a new shipment first without status or is_completed columns
                const newShipment = await shipmentService.createShipment(savePayload);

                // 2. If completed checkbox is checked, trigger RPC
                if (shouldComplete) {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('complete_shipment', {
                        p_shipment_id: newShipment.id
                    });

                    if (rpcError) {
                        throw new Error(rpcError.message);
                    }
                    if (rpcData && rpcData.success === false) {
                        throw new Error(rpcData.message);
                    }
                    successMessage = 'Stok berhasil ditambahkan';
                }
            }

            onSuccess(successMessage);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to render formatted numeric inputs
    const renderNumericField = (name: keyof Shipment, label: string, placeholder: string, required = false) => {
        return (
            <Controller
                name={name as any}
                control={control}
                rules={required ? { required: `${label} wajib diisi` } : undefined}
                render={({ field: { onChange, value, ...field } }) => {
                    const formattedValue = value === 0 || value === null || value === undefined
                        ? ''
                        : formatNumberStr(Number(value));

                    return (
                        <TextField
                            {...field}
                            value={formattedValue}
                            label={label}
                            placeholder={placeholder}
                            fullWidth
                            disabled={isFormDisabled}
                            error={!!errors[name]}
                            helperText={(errors[name] as any)?.message}
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                const numValue = rawValue ? parseInt(rawValue, 10) : 0;
                                onChange(numValue);
                            }}
                        />
                    );
                }}
            />
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                {isLocked
                    ? 'Data Pembelian (Terkunci)'
                    : isEditMode
                    ? 'Ubah Data Pembelian'
                    : 'Tambah Data Pembelian'}
            </Typography>

            {isLocked && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Pembelian ini telah berstatus selesai dan terkunci. Data tidak dapat diubah kembali.
                </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    {/* Section 1: Info Inbound */}
                    <Grid size={12}>
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
                            Info Inbound
                        </Typography>
                    </Grid>
                    
                    <Grid size={12}>
                        <TextField
                            label="Perusahaan"
                            value={companyName}
                            fullWidth
                            disabled
                        />
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="invoice_no"
                            control={control}
                            rules={{ required: 'No. Invoice wajib diisi' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="No. Invoice"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.invoice_no}
                                    helperText={errors.invoice_no?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="supplier_id"
                            control={control}
                            rules={{ required: 'Supplier wajib diisi' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Supplier"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.supplier_id}
                                    helperText={errors.supplier_id?.message}
                                >
                                    {suppliers.map(s => (
                                        <MenuItem key={s.id} value={s.id}>
                                            <Box>
                                                <Typography variant="body2">{s.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {s.city ? `${s.city}, ` : ''}{s.province || ''}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="vessel_name"
                            control={control}
                            rules={{ required: 'Nama Vessel wajib diisi' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nama Vessel"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.vessel_name}
                                    helperText={errors.vessel_name?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="asal_batu"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Asal Batu"
                                    fullWidth
                                    disabled={isFormDisabled}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="product_id"
                            control={control}
                            rules={{ required: 'Produk wajib diisi' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Produk"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.product_id}
                                    helperText={errors.product_id?.message}
                                >
                                    {products.map(p => (
                                        <MenuItem key={p.id} value={p.id}>
                                            <Box>
                                                <Typography variant="body2">{p.name}</Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    SKU: {p.sku_code}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="jenis_batu"
                            control={control}
                            rules={{ required: 'Jenis Batu wajib dipilih' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Jenis Batu"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.jenis_batu}
                                    helperText={errors.jenis_batu?.message}
                                >
                                    <MenuItem value="High">High</MenuItem>
                                    <MenuItem value="Medium">Medium</MenuItem>
                                    <MenuItem value="Low">Low</MenuItem>
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="eta"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="date"
                                    label="ETA"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="issue_date"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="date"
                                    label="Tanggal Invoice"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="loading_date"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="date"
                                    label="Tanggal Loading"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        {renderNumericField('quantity', 'Quantity (Kg)', 'Masukkan quantity...', true)}
                    </Grid>

                    {/* Section 2: Keuangan */}
                    <Grid size={12}>
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mt: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
                            Keuangan
                        </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        {renderNumericField('harga', 'Harga (Kg)', 'Masukkan harga...', true)}
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label="Subtotal (IDR)"
                            value={formatNumberStr(subtotal)}
                            fullWidth
                            disabled
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        {renderNumericField('ppn_tax', 'PPN', 'Masukkan PPN...')}
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        {renderNumericField('pph_tax', 'PPh', 'Masukkan PPh...')}
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        {renderNumericField('disc', 'Diskon', 'Masukkan diskon...')}
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label="Total Akhir"
                            value={formatNumberStr(finalPayment)}
                            fullWidth
                            disabled
                        />
                    </Grid>

                    {/* Section 3: Status */}
                    <Grid size={12}>
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mt: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
                            Status & Penguncian
                        </Typography>
                    </Grid>



                    <Grid size={{ xs: 12, md: 4 }}>
                        <Controller
                            name="qty_loading"
                            control={control}
                            render={({ field }) => {
                                const formattedVal = formatNumberStr(Number(field.value) || 0);
                                return (
                                    <TextField
                                        {...field}
                                        value={formattedVal}
                                        label="Qty Loading (Kg)"
                                        fullWidth
                                        disabled
                                    />
                                );
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Controller
                            name="is_completed"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            {...field}
                                            checked={!!value}
                                            disabled={isLocked}
                                            onChange={(e) => onChange(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Status Selesai (Kunci Record)"
                                />
                            )}
                        />
                    </Grid>
                </Grid>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        variant="outlined"
                        sx={{ borderRadius: '8px' }}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || isLocked}
                        sx={{
                            borderRadius: '8px',
                            background: isLocked ? undefined : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                        }}
                    >
                        {loading ? t('common.loading') : t('common.save')}
                    </Button>
                </Box>
            </Box>
        </Box>
);
};

export default ShipmentForm;
