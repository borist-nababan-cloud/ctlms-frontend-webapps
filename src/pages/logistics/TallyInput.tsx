import { useState, useEffect } from 'react';
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
import { PhotoCamera, Image } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { shipmentService } from '../../lib/shipmentService';
import { logisticsService } from '../../lib/logisticsService';
import { supabase } from '../../lib/supabaseClient';
import type { ShipmentDetailed, TruckingLog } from '../../types/supabase';
import { useTranslation } from 'react-i18next';

const TallyInput = () => {
    useTranslation(); // Keep translation hook for future i18n use
    const [activeShipments, setActiveShipments] = useState<ShipmentDetailed[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
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
        } catch {
            setError('Gagal memuat data pengiriman aktif.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleScanTicket = async (event: { target: { files: FileList | null } }) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            // Set preview immediately
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));

            setScanning(true);
            setError(null);

            try {
                // Convert to Base64
                const base64 = await fileToBase64(file);

                // Invoke Edge Function
                const { data, error } = await supabase.functions.invoke('ocr-ticket', {
                    body: { imageBase64: base64 }
                });

                if (error) {
                    throw error;
                }

                if (!data) throw new Error('No data returned from OCR');

                // Handle tunneled errors (status 200 but logic error)
                if (data.success === false || data.error) {
                    throw new Error(`OCR Server Error: ${data.error}`);
                }

                // Map results to form
                if (data.truck_plate) setValue('truck_plate', data.truck_plate.toUpperCase());
                if (data.ticket_number) setValue('ticket_number', data.ticket_number);
                if (data.gross_weight) setValue('gross_weight', data.gross_weight);
                if (data.tare_weight) setValue('tare_weight', data.tare_weight);

                setSuccessMsg('Tiket berhasil dipindai dengan OCR');

            } catch (err: any) {
                console.error('OCR Error:', err);
                if (err.status === 401 || (err.message && err.message.includes('401'))) {
                    setError('Akses tidak sah (401). Terjadi kesalahan otentikasi.');
                } else {
                    setError('Gagal memindai tiket. Silakan coba lagi atau input manual.');
                }
            } finally {
                setScanning(false);
            }
        }
    };

    const onSubmit = async (data: Partial<TruckingLog>) => {
        // Validate File
        try {
            if (!data.shipment_id) {
                setError('Silakan pilih pengiriman.');
                return;
            }

            const trimmedPlate = data.truck_plate?.trim() || '';
            const trimmedTicket = String(data.ticket_number || '').trim();

            if (!trimmedPlate) {
                setError('No. Polisi Truk wajib diisi');
                return;
            }
            if (!trimmedTicket) {
                setError('Nomor Tiket Timbangan wajib diisi');
                return;
            }

            setSubmitting(true);
            // 1. Upload Photo (Optional)
            let publicUrl: string | null = null;
            if (selectedFile) {
                const fileName = `${Date.now()}_${trimmedTicket}.jpg`;
                const filePath = `logistics/${fileName}`;
                publicUrl = await logisticsService.uploadTicketPhoto(selectedFile, filePath);
            }

            // 2. Insert Log
            await logisticsService.createLog({
                ...data,
                truck_plate: trimmedPlate.toUpperCase(),
                ticket_number: trimmedTicket,
                photo_url: publicUrl
            });

            // Success
            setSuccessMsg(`Log berhasil disimpan! Netto: ${data.net_weight?.toLocaleString('id-ID')} Kg`);

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
            console.error('Error saving log:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 2 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                Input Masuk Barang
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
                                rules={{ required: 'Pengiriman wajib dipilih' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="Pilih Pengiriman"
                                        fullWidth
                                        disabled={loading}
                                    >
                                        {activeShipments.map(s => (
                                            <MenuItem key={s.id} value={s.id}>
                                                {s.vessel_name} ({s.invoice_no})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            {/* OCR & Camera Buttons */}
                            <Stack direction="row" spacing={2}>
                                {/* Camera Button */}
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={scanning ? <CircularProgress size={20} /> : <PhotoCamera />}
                                    fullWidth
                                    color="primary"
                                    sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}
                                    disabled={scanning || submitting}
                                >
                                    {scanning ? 'Memindai...' : 'Kamera'}
                                    <input
                                        hidden
                                        accept="image/*"
                                        type="file"
                                        onChange={handleScanTicket}
                                        {...({ capture: 'environment' } as any)} // Force capture attribute
                                    />
                                </Button>

                                {/* Gallery Button */}
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={scanning ? <CircularProgress size={20} /> : <Image />}
                                    fullWidth
                                    color="secondary"
                                    sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}
                                    disabled={scanning || submitting}
                                >
                                    {scanning ? 'Memindai...' : 'Galeri'}
                                    <input
                                        hidden
                                        accept="image/*"
                                        // No capture attribute for Gallery
                                        type="file"
                                        onChange={handleScanTicket}
                                    />
                                </Button>
                            </Stack>


                            {/* Image Preview */}
                            {previewUrl && (
                                <Box sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 200, display: 'flex', justifyContent: 'center', bgcolor: '#000' }}>
                                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                                </Box>
                            )}

                            {/* Truck Info */}
                            <Controller
                                name="truck_plate"
                                control={control}
                                rules={{ required: 'No. Polisi wajib diisi' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="No. Polisi Truk"
                                        placeholder="e.g. B 1234 XY"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                )}
                            />

                            <Controller
                                name="ticket_number"
                                control={control}
                                rules={{ required: 'Nomor Tiket wajib diisi' }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nomor Tiket Timbangan"
                                        fullWidth
                                        type="number" // Changed to number to match OCR output type
                                        InputLabelProps={{ shrink: true }}
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
                                            InputLabelProps={{ shrink: true }}
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
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    )}
                                />
                            </Stack>

                            {/* Net Weight Display */}
                            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="textSecondary">BERAT BERSIH (NETTO)</Typography>
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                    {(gross - tare).toLocaleString('id-ID')} <span style={{ fontSize: '1rem' }}>Kg</span>
                                </Typography>
                            </Box>

                            {/* Submit */}
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={submitting || scanning}
                                sx={{ mt: 2, py: 1.5, fontSize: '1.1rem' }}
                            >
                                {submitting ? <CircularProgress size={24} color="inherit" /> : 'KIRIM DATA'}
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
        </Container >
    );
};

export default TallyInput;

