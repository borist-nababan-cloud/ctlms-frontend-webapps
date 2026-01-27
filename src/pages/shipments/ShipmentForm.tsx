import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    MenuItem,
    Alert
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { shipmentService } from '../../lib/shipmentService';
import { masterService } from '../../lib/masterService';
import type { Shipment, MasterPartner, MasterProduct } from '../../types/supabase';
import { useTranslation } from 'react-i18next';

interface ShipmentFormProps {
    shipmentId: string | null;
    onSuccess: () => void;
    onClose: () => void;
}

const ShipmentForm: React.FC<ShipmentFormProps> = ({ shipmentId, onSuccess, onClose }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<MasterPartner[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);

    const isEditMode = Boolean(shipmentId);

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<Partial<Shipment>>({
        defaultValues: {
            reference_no: '',
            supplier_id: '',
            product_id: '',
            vessel_name: '',
            origin_location: '',
            draft_survey_qty: 0,
            status: 'planned',
            eta: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [allPartners, allProducts] = await Promise.all([
                    masterService.getPartners(),
                    masterService.getProducts()
                ]);
                // Filter only suppliers
                setSuppliers(allPartners.filter(p => p.type === 'SUPPLIER'));
                setProducts(allProducts);

                if (isEditMode && shipmentId) {
                    const shipment = await shipmentService.getShipmentById(shipmentId);
                    if (shipment) {
                        setValue('reference_no', shipment.reference_no);
                        setValue('supplier_id', shipment.supplier_id);
                        setValue('product_id', shipment.product_id);
                        setValue('vessel_name', shipment.vessel_name);
                        setValue('origin_location', shipment.origin_location);
                        setValue('draft_survey_qty', shipment.draft_survey_qty);
                        setValue('status', shipment.status);
                        setValue('eta', shipment.eta);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        loadMasterData();
    }, [shipmentId, isEditMode, setValue]);

    const onSubmit = async (data: Partial<Shipment>) => {
        setLoading(true);
        setError(null);
        try {
            if (isEditMode && shipmentId) {
                await shipmentService.updateShipment(shipmentId, data);
            } else {
                await shipmentService.createShipment(data);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                {isEditMode ? 'Edit Shipment' : 'Create Shipment'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, // 1 column on mobile, 2 on desktop
                    gap: 2 // 16px gap
                }}>
                    {/* Row 1: Reference No - Status */}
                    <Controller
                        name="reference_no"
                        control={control}
                        rules={{ required: 'Reference No is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Reference No"
                                fullWidth
                                error={!!errors.reference_no}
                                helperText={errors.reference_no?.message}
                            />
                        )}
                    />
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Status"
                                fullWidth
                            >
                                <MenuItem value="planned">Planned</MenuItem>
                                <MenuItem value="loading">Loading</MenuItem>
                                <MenuItem value="sailing">Sailing</MenuItem>
                                <MenuItem value="discharging">Discharging</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </TextField>
                        )}
                    />

                    {/* Row 2: Supplier - Vessel Name */}
                    <Controller
                        name="supplier_id"
                        control={control}
                        rules={{ required: 'Supplier is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Supplier"
                                fullWidth
                                error={!!errors.supplier_id}
                                helperText={errors.supplier_id?.message}
                            >
                                {suppliers.map(s => (
                                    <MenuItem key={s.id} value={s.id}>
                                        <Box>
                                            <Typography variant="body1">{s.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {s.city ? `${s.city}, ` : ''}{s.province || ''}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                    <Controller
                        name="vessel_name"
                        control={control}
                        rules={{ required: 'Vessel Name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Vessel Name"
                                fullWidth
                                error={!!errors.vessel_name}
                                helperText={errors.vessel_name?.message}
                            />
                        )}
                    />

                    {/* Row 3: Origin Jetty - ETA */}
                    <Controller
                        name="origin_location"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Origin Jetty"
                                fullWidth
                            />
                        )}
                    />
                    <Controller
                        name="eta"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                type="date"
                                label="ETA"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                    />

                    {/* Row 4: Product - Draft Survey Qty */}
                    <Controller
                        name="product_id"
                        control={control}
                        rules={{ required: 'Product is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Product"
                                fullWidth
                                error={!!errors.product_id}
                                helperText={errors.product_id?.message}
                            >
                                {products.map(p => (
                                    <MenuItem key={p.id} value={p.id}>
                                        <Box>
                                            <Typography variant="body1">{p.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                SKU: {p.sku_code}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                    <Controller
                        name="draft_survey_qty"
                        control={control}
                        rules={{ required: 'Quantity is required', min: 0 }}
                        render={({ field: { onChange, value, ...field } }) => {
                            // Format value for display (separator id-ID)
                            const formattedValue = value === 0 ? '' : new Intl.NumberFormat('id-ID').format(value || 0);

                            return (
                                <TextField
                                    {...field}
                                    value={formattedValue}
                                    label="Draft Survey Qty (Kg)"
                                    fullWidth
                                    error={!!errors.draft_survey_qty}
                                    helperText={errors.draft_survey_qty?.message || "Example: Input 7.500.000 for 7,500 Tons"}
                                    onChange={(e) => {
                                        // Remove non-numeric characters
                                        const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                        // Convert to number
                                        const numValue = rawValue ? parseInt(rawValue, 10) : 0;
                                        onChange(numValue);
                                    }}
                                />
                            );
                        }}
                    />
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                    <Button
                        type="button"
                        onClick={() => {
                            onClose();
                        }}
                        disabled={loading}
                        variant="outlined"
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                    >
                        {t('common.save')}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default ShipmentForm;
