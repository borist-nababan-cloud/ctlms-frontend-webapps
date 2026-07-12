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
    Checkbox,
    CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { salesService } from '../../lib/salesService';
import { masterService } from '../../lib/masterService';
import type { SalesOrder, MasterPartner, MasterProduct, MasterCompany } from '../../types/supabase';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { containsHtmlOrScript } from '../../lib/sanitizer';

const formatNumberStr = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
};

interface SalesOrderFormValues {
    order_no: string;
    po_number: string;
    company_id: string;
    customer_id: string;
    product_id: string;
    product_name: string;
    qty_ordered: number;
    is_completed: boolean;
    notes: string;
}

interface SalesOrderFormProps {
    salesOrderId: string | null;
    onSuccess: (message?: string) => void;
    onClose: () => void;
}

const SalesOrderForm: React.FC<SalesOrderFormProps> = ({ salesOrderId, onSuccess, onClose }) => {
    const { t } = useTranslation();
    const { profile: loggedInProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [companies, setCompanies] = useState<MasterCompany[]>([]);
    const [customers, setCustomers] = useState<MasterPartner[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [isOriginallyCompleted, setIsOriginallyCompleted] = useState(false);

    const isEditMode = Boolean(salesOrderId);
    const isLocked = isEditMode && isOriginallyCompleted;

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<SalesOrderFormValues>({
        defaultValues: {
            order_no: '',
            po_number: '',
            company_id: '',
            customer_id: '',
            product_id: '',
            product_name: '',
            qty_ordered: 0,
            is_completed: false,
            notes: ''
        }
    });

    const isCompletedChecked = watch('is_completed') || false;
    const isFormDisabled = isCompletedChecked || isLocked;

    const selectedProductId = watch('product_id');

    // Fetch master data
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [allCompanies, allPartners, allProducts] = await Promise.all([
                    masterService.getCompanies(),
                    masterService.getPartners(),
                    masterService.getProducts()
                ]);

                setCompanies(allCompanies);
                let filteredCustomers = allPartners.filter(p => p.type === 'CUSTOMER');
                if (loggedInProfile?.company_id) {
                    filteredCustomers = filteredCustomers.filter(p => p.company_id === loggedInProfile.company_id);
                }
                setCustomers(filteredCustomers);
                setProducts(allProducts.filter(p => p.type === 'PUBLISHED_FINISHED'));

                if (isEditMode && salesOrderId) {
                    const order = await salesService.getSalesOrderById(salesOrderId);
                    if (order) {
                        setValue('order_no', order.order_no);
                        setValue('po_number', order.po_number || '');
                        setValue('company_id', order.company_id || '');
                        setValue('customer_id', order.customer_id);
                        setValue('product_id', order.product_id);
                        setValue('qty_ordered', Number(order.qty_ordered) || 0);
                        setValue('is_completed', order.is_completed || false);
                        setValue('notes', order.notes || '');
                        setIsOriginallyCompleted(order.is_completed || false);

                        // Find product name as default or stored custom name
                        const matchedProd = allProducts.find(p => p.id === order.product_id);
                        setValue('product_name', order.product_name || (matchedProd ? matchedProd.name : ''));
                    }
                } else {
                    // Create mode: Auto-generate order number & set default company ID
                    const generatedNo = await generateOrderNo();
                    setValue('order_no', generatedNo);

                    if (loggedInProfile?.company_id) {
                        setValue('company_id', loggedInProfile.company_id);
                    }
                }
            } catch (err: any) {
                console.error('Error loading sales order master data:', err);
                setError('Gagal memuat data master dari sistem.');
            }
        };

        loadMasterData();
    }, [salesOrderId, isEditMode, setValue, loggedInProfile]);

    // Update product name input field when product selection changes
    useEffect(() => {
        if (selectedProductId && products.length > 0) {
            const matchedProd = products.find(p => p.id === selectedProductId);
            if (matchedProd) {
                // Only overwrite if not locked
                if (!isFormDisabled) {
                    setValue('product_name', matchedProd.name);
                }
            }
        }
    }, [selectedProductId, products, setValue, isFormDisabled]);

    // Generator for SO/yyMMDD/xxxxx
    const generateOrderNo = async () => {
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`; // e.g. "260606"

        try {
            const { count, error: countError } = await supabase
                .from('sales_orders')
                .select('*', { count: 'exact', head: true })
                .like('order_no', `SO/${dateStr}/%`);

            if (countError) throw countError;

            const nextSerial = String((count || 0) + 1).padStart(5, '0');
            return `SO/${dateStr}/${nextSerial}`;
        } catch (err) {
            console.error('Error generating SO order number:', err);
            // Fallback unique number using timestamp
            const randomSuffix = String(Math.floor(10000 + Math.random() * 90000));
            return `SO/${dateStr}/${randomSuffix}`;
        }
    };

    const onSubmit = async (data: SalesOrderFormValues) => {
        if (isLocked) {
            setError('Data ini sudah dikunci (Status Selesai) and tidak dapat diubah.');
            return;
        }

        setLoading(true);
        setError(null);

        const trimmedProductName = data.product_name?.trim() || '';
        const trimmedNotes = data.notes?.trim() || '';

        if (!trimmedProductName) {
            setError('Nama Produk wajib diisi');
            setLoading(false);
            return;
        }

        if (containsHtmlOrScript(trimmedProductName) || containsHtmlOrScript(trimmedNotes)) {
            setError('Input mengandung karakter tidak valid atau script berbahaya');
            setLoading(false);
            return;
        }

        // Build save payload
        const savePayload: Partial<SalesOrder> = {
            order_no: data.order_no,
            po_number: data.po_number || null,
            company_id: data.company_id || null,
            customer_id: data.customer_id,
            product_id: data.product_id,
            product_name: trimmedProductName,
            qty_ordered: data.qty_ordered || 0,
            price_per_kg: 0, // Enforce non-null DB constraint with default 0 as quantity-only module
            is_completed: Boolean(data.is_completed),
            status: data.is_completed ? 'COMPLETED' : 'DRAFT',
            notes: trimmedNotes || null,
            created_by: loggedInProfile?.uuid || null
        };

        try {
            let successMessage = 'Data berhasil disimpan';
            if (savePayload.is_completed) {
                successMessage = 'Pengiriman selesai';
            }

            if (isEditMode && salesOrderId) {
                await salesService.updateSalesOrder(salesOrderId, savePayload);
            } else {
                await salesService.createSalesOrder(savePayload);
            }

            onSuccess(successMessage);
        } catch (err: any) {
            console.error('Error saving sales order:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setLoading(false);
        }
    };

    const renderNumericField = (name: keyof SalesOrderFormValues, label: string, placeholder: string, required = false) => {
        return (
            <Controller
                name={name as any}
                control={control}
                rules={required ? { required: `${label} wajib diisi`, min: { value: 1, message: `${label} harus lebih besar dari 0` } } : undefined}
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
                    ? 'Data Penjualan (Terkunci)'
                    : isEditMode
                    ? 'Ubah Data Penjualan'
                    : 'Tambah Data Penjualan'}
            </Typography>

            {isLocked && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Transaksi penjualan ini telah selesai dan dikunci. Data tidak dapat diubah kembali.
                </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    {/* Order Details */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="order_no"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="No. Penjualan"
                                    fullWidth
                                    disabled
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="po_number"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="No. PO"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    placeholder="Masukkan No. PO dari Customer"
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="company_id"
                            control={control}
                            rules={{ required: 'Perusahaan wajib dipilih' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Pilih Perusahaan"
                                    fullWidth
                                    disabled={true}
                                    error={!!errors.company_id}
                                    helperText={errors.company_id?.message}
                                >
                                    {companies.map(c => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="customer_id"
                            control={control}
                            rules={{ required: 'Customer wajib dipilih' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Pilih Customer"
                                    fullWidth
                                    disabled={isEditMode || isFormDisabled}
                                    error={!!errors.customer_id}
                                    helperText={errors.customer_id?.message}
                                >
                                    {customers.map(cust => (
                                        <MenuItem key={cust.id} value={cust.id}>
                                            {cust.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="product_id"
                            control={control}
                            rules={{ required: 'Produk wajib dipilih' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Pilih Produk"
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

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                            name="product_name"
                            control={control}
                            rules={{ required: 'Nama Produk wajib diisi' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nama Produk"
                                    fullWidth
                                    disabled={isFormDisabled}
                                    error={!!errors.product_name}
                                    helperText={errors.product_name?.message}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        {renderNumericField('qty_ordered', 'Qty Pesan', 'Masukkan quantity...', true)}
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
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

                    <Grid size={12}>
                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Catatan"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    disabled={isFormDisabled}
                                    placeholder="Masukkan catatan jika ada..."
                                />
                            )}
                        />
                    </Grid>
                </Grid>

                {/* Form Actions */}
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
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                        sx={{
                            borderRadius: '8px',
                            background: isLocked ? undefined : 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)'
                        }}
                    >
                        {loading ? t('common.loading') : 'Simpan'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default SalesOrderForm;
