import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    TextField,
    MenuItem,
    Card,
    CardContent,
    Stack,
    Alert,
    CircularProgress,
    Snackbar
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { shipmentService } from '../../lib/shipmentService';
import { logisticsService } from '../../lib/logisticsService';
import type { ShipmentDetailed, TruckingLog } from '../../types/supabase';
import { useTranslation } from 'react-i18next';

const TallyInput = () => {
    useTranslation(); // Keep translation hook for future i18n use
    const [activeShipments, setActiveShipments] = useState<ShipmentDetailed[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // File state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { control, handleSubmit, watch, setValue, reset } = useForm<Partial<TruckingLog>>({
        defaultValues: {
            shipment_id: '',
            truck_plate: '',
            ticket_number: '',
            gross_weight: 0,
            tare_weight: 0,
            net_weight: 0
        }
    });

    const gross = watch('gross_weight') || 0;
    const tare = watch('tare_weight') || 0;

    // Auto-calc Net Weight
    useEffect(() => {
        const net = Math.max(0, gross - tare);
        setValue('net_weight', net);
    }, [gross, tare, setValue]);

    useEffect(() => {
        loadShipments();
    }, []);

    const loadShipments = async () => {
        try {
            setLoading(true);
            const data = await shipmentService.getShipments();
            // Filter: only discharging or sailing
            const active = data.filter(s => ['discharging', 'sailing'].includes(s.status));
            setActiveShipments(active);
        } catch (err: any) {
            setError('Failed to load active shipments');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: Partial<TruckingLog>) => {
        // Validate File
        try {
            // 1. Upload Photo (Optional)
            let publicUrl: string | null = null;
            if (selectedFile) {
                const fileName = `${Date.now()}_${data.ticket_number}.jpg`;
                const filePath = `logistics/${fileName}`;
                publicUrl = await logisticsService.uploadTicketPhoto(selectedFile, filePath);
            }

            // 2. Insert Log
            await logisticsService.createLog({
                ...data,
                truck_plate: data.truck_plate?.toUpperCase(),
                photo_url: publicUrl
            });

            // Success
            setSuccessMsg(`Log Saved! Net: ${data.net_weight?.toLocaleString('id-ID')} Kg`);

            // Reset Form but keep shipment selected
            const currentShipment = data.shipment_id;
            reset({
                shipment_id: currentShipment,
                truck_plate: '',
                ticket_number: '',
                gross_weight: 0,
                tare_weight: 0,
                net_weight: 0
            });
            setSelectedFile(null);
            setPreviewUrl(null);

        } catch (err: any) {
            setError(err.message || 'Failed to save log');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 2 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                Tally / Input
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent>
                    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                        <Stack spacing={2}>

                            {/* Shipment Selection */}
                            <Controller
                                name="shipment_id"
                                control={control}
                                rules={{ required: 'Shipment is required' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="Select Shipment"
                                        fullWidth
                                        disabled={loading}
                                    >
                                        {activeShipments.map(s => (
                                            <MenuItem key={s.id} value={s.id}>
                                                {s.vessel_name} ({s.reference_no})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            {/* Truck Info */}
                            <Controller
                                name="truck_plate"
                                control={control}
                                rules={{ required: 'Plate No is required' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Truck Plate No."
                                        placeholder="e.g. B 1234 XY"
                                        fullWidth
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                )}
                            />

                            <Controller
                                name="ticket_number"
                                control={control}
                                rules={{ required: 'Ticket No is required' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Weighing Ticket No."
                                        fullWidth
                                        type="number"
                                    />
                                )}
                            />

                            {/* Weights */}
                            <Stack direction="row" spacing={2}>
                                <Controller
                                    name="gross_weight"
                                    control={control}
                                    rules={{ required: true, min: 1 }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Gross (Kg)"
                                            type="number"
                                            fullWidth
                                        />
                                    )}
                                />
                                <Controller
                                    name="tare_weight"
                                    control={control}
                                    rules={{ required: true, min: 0 }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Tare (Kg)"
                                            type="number"
                                            fullWidth
                                        />
                                    )}
                                />
                            </Stack>

                            {/* Net Weight Display */}
                            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="textSecondary">NET WEIGHT</Typography>
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                    {(gross - tare).toLocaleString('id-ID')} <span style={{ fontSize: '1rem' }}>Kg</span>
                                </Typography>
                            </Box>

                            {/* Camera Input */}
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<PhotoCamera />}
                                fullWidth
                                sx={{ py: 1.5, borderStyle: 'dashed' }}
                            >
                                {selectedFile ? 'Change Photo' : 'Take Ticket Photo'}
                                <input
                                    hidden
                                    accept="image/*"
                                    capture="environment" // Request rear camera on mobile
                                    type="file"
                                    onChange={handleFileSelect}
                                />
                            </Button>

                            {/* Image Preview */}
                            {previewUrl && (
                                <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', maxHeight: 200, display: 'flex', justifyContent: 'center', bgcolor: '#000' }}>
                                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                                </Box>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={submitting}
                                sx={{ mt: 2, py: 1.5, fontSize: '1.1rem' }}
                            >
                                {submitting ? <CircularProgress size={24} /> : 'SUBMIT DATA'}
                            </Button>

                        </Stack>
                    </Box>
                </CardContent>
            </Card>

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

export default TallyInput;
