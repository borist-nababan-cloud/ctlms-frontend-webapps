import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Box,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    Typography,
} from '@mui/material';
import {
    PhotoCamera,
    Image as ImageIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { supabase } from '../../lib/supabaseClient';
import { logisticsService } from '../../lib/logisticsService';
import { useColorMode } from '../../context/ThemeContext';

interface OcrResult {
    photo_url: string;
    truck_plate?: string;
    ticket_number?: string;
    gross_weight?: number;
    tare_weight?: number;
    net_weight?: number;
}

interface ScannerHubProps {
    open: boolean;
    onClose: () => void;
    onCapture: (result: OcrResult) => void;
}

const ScannerHub: React.FC<ScannerHubProps> = ({ open, onClose, onCapture }) => {
    const { mode } = useColorMode();
    const [tabValue, setTabValue] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const webcamRef = useRef<Webcam>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setCameraError(null);
    };

    // Helper: Convert file to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Helper: Convert Base64 back to a File object for Storage upload
    const base64ToFile = (base64String: string, filename: string): File => {
        const arr = base64String.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    // Camera Access Error Callback
    const handleCameraError = () => {
        setCameraError("Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.");
    };

    // Unified Upload & OCR Process
    const processImage = async (file: File, base64Data: string) => {
        setProcessing(true);
        setCameraError(null);
        try {
            // 1. Upload file to Supabase Storage
            const fileName = `${Date.now()}_ocr_ticket.jpg`;
            const filePath = `logistics/${fileName}`;
            const publicUrl = await logisticsService.uploadTicketPhoto(file, filePath);

            if (!publicUrl) throw new Error("Gagal mengunggah foto ke storage");

            // 2. Invoke OCR Edge Function
            const { data, error: ocrError } = await supabase.functions.invoke('ocr-ticket', {
                body: { imageBase64: base64Data }
            });

            if (ocrError) throw ocrError;
            if (!data) throw new Error('OCR response empty');

            if (data.success === false || data.error) {
                throw new Error(`OCR Server Error: ${data.error}`);
            }

            // 3. Assemble and return structured result
            const ocrTicketNumber = data.ticket_number || data.ticket_no;
            const result: OcrResult = {
                photo_url: publicUrl,
                truck_plate: data.truck_plate ? String(data.truck_plate).toUpperCase() : undefined,
                ticket_number: ocrTicketNumber ? String(ocrTicketNumber).toUpperCase() : undefined,
                gross_weight: data.gross_weight ? Number(data.gross_weight) : undefined,
                tare_weight: data.tare_weight ? Number(data.tare_weight) : undefined,
                net_weight: data.gross_weight && data.tare_weight 
                    ? Math.max(0, Number(data.gross_weight) - Number(data.tare_weight)) 
                    : undefined
            };

            onCapture(result);
            onClose();
        } catch (err: any) {
            console.error('OCR processing error:', err);
            setToastMsg('Gagal memindai gambar. Silakan input manual atau coba gambar lain.');
        } finally {
            setProcessing(false);
        }
    };

    // Trigger Camera capture and process
    const handleCaptureFromCamera = async () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                setToastMsg('Gagal mengambil gambar dari kamera.');
                return;
            }

            // Convert captured screenshot to File
            const file = base64ToFile(imageSrc, 'camera_capture.jpg');
            await processImage(file, imageSrc);
        }
    };

    // Trigger Gallery selection change and process
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            try {
                const base64 = await fileToBase64(file);
                await processImage(file, base64);
            } catch (err) {
                console.error(err);
                setToastMsg('Gagal memproses file dari galeri.');
            }
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={processing ? undefined : onClose}
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
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                        <Tab icon={<PhotoCamera />} label="Kamera" disabled={processing} />
                        <Tab icon={<ImageIcon />} label="Galeri" disabled={processing} />
                    </Tabs>
                </DialogTitle>

                <DialogContent sx={{ p: 0, position: 'relative', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#000' }}>
                    
                    {/* Live Camera Tab */}
                    {tabValue === 0 && (
                        <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {cameraError ? (
                                <Box sx={{ p: 3, textAlign: 'center', color: '#fff' }}>
                                    <Alert severity="error" sx={{ mb: 2 }}>{cameraError}</Alert>
                                    <Typography variant="body2">Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.</Typography>
                                </Box>
                            ) : (
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{
                                        facingMode: 'environment',
                                        width: 1280,
                                        height: 720
                                    }}
                                    onUserMediaError={handleCameraError}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Gallery Tab */}
                    {tabValue === 1 && (
                        <Box sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={triggerFileInput}
                                startIcon={<ImageIcon />}
                                disabled={processing}
                                sx={{
                                    borderStyle: 'dashed',
                                    color: '#fff',
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    py: 4,
                                    px: 6,
                                    borderRadius: '12px',
                                    '&:hover': {
                                        borderColor: '#fff',
                                        background: 'rgba(255, 255, 255, 0.05)'
                                    }
                                }}
                            >
                                Pilih dari Galeri
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </Box>
                    )}

                    {/* Loading Overlay */}
                    {processing && (
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 10,
                            gap: 2
                        }}>
                            <CircularProgress color="primary" />
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                                Memindai tiket...
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        color="inherit"
                        disabled={processing}
                        startIcon={<CloseIcon />}
                        sx={{ borderRadius: '20px', textTransform: 'none' }}
                    >
                        Tutup
                    </Button>
                    
                    {tabValue === 0 && !cameraError && (
                        <Button
                            onClick={handleCaptureFromCamera}
                            variant="contained"
                            disabled={processing}
                            startIcon={<PhotoCamera />}
                            sx={{
                                borderRadius: '20px',
                                textTransform: 'none',
                                background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                            }}
                        >
                            Scan / Ambil Foto
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Error notifications */}
            <Snackbar
                open={!!toastMsg}
                autoHideDuration={4000}
                onClose={() => setToastMsg(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error" onClose={() => setToastMsg(null)} sx={{ width: '100%' }}>
                    {toastMsg}
                </Alert>
            </Snackbar>
        </>
    );
};

export default ScannerHub;
