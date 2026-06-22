import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    Chip,
    Snackbar,
    TextField,
    MenuItem,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Check as CheckIcon,
    Block as BlockIcon
} from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { containsHtmlOrScript } from '../../lib/sanitizer';
import { tcpService, type TcpRecord } from '../../lib/tcpService';

// Helper functions for Indonesian thousand formatting
const formatThousand = (val: string | number): string => {
    if (val === undefined || val === null || val === '') return '';
    // Remove all non-digits
    const numStr = val.toString().replace(/\D/g, '');
    if (!numStr) return '';
    return new Intl.NumberFormat('id-ID').format(Number(numStr));
};

const parseThousand = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove all non-digits
    const cleanStr = val.replace(/\D/g, '');
    return Number(cleanStr) || 0;
};

const TcpInput = () => {
    const { mode } = useColorMode();
    const { profile } = useAuth();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;
    const isSuperuser = userRole === 1 || userRole === 8;

    // List and dropdown data
    const [records, setRecords] = useState<TcpRecord[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);

    // Loading and notification states
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<TcpRecord | null>(null);

    // Superuser Rejection Dialog state
    const [openRejectDialog, setOpenRejectDialog] = useState(false);
    const [rejectRecord, setRejectRecord] = useState<TcpRecord | null>(null);
    const [rejectionNotesInput, setRejectionNotesInput] = useState<string>('');

    // Form inputs state
    const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
    const [tcpValue, setTcpValue] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Populated values from selected shipment
    const [productId, setProductId] = useState<string>('');
    const [productName, setProductName] = useState<string>('');
    const [invoiceNo, setInvoiceNo] = useState<string>('');
    const [vesselName, setVesselName] = useState<string>('');
    const [shipmentQty, setShipmentQty] = useState<number>(0);
    const [totalIn, setTotalIn] = useState<number>(0);
    const [totalOut, setTotalOut] = useState<number>(0);

    // Hitung Stok Sistem (Teoritis)
    const stokSistemTeoritis = useMemo(() => {
        return shipmentQty - totalOut;
    }, [shipmentQty, totalOut]);

    // Hitung Selisih dan Stok Aktual (Final) dynamically
    const { selisih, stokAktual } = useMemo(() => {
        const tcpNum = parseThousand(tcpValue);
        const sel = stokSistemTeoritis - tcpNum;
        const aktual = tcpNum;
        return { selisih: sel, stokAktual: aktual };
    }, [stokSistemTeoritis, tcpValue]);

    // Validation: Checks if selected shipment already has TCP input
    const isShipmentAlreadyConsolidated = useMemo(() => {
        if (!selectedShipmentId || isEditMode) return false;
        const shipment = shipments.find(s => s.id === selectedShipmentId);
        return !!(shipment?.id_tcp);
    }, [selectedShipmentId, shipments, isEditMode]);

    // Fetch existing records
    const fetchTcpRecords = async () => {
        if (!companyId) return;
        try {
            setLoading(true);
            const data = await tcpService.getTcpRecords(companyId);
            setRecords(data);
        } catch (err) {
            console.error('Error fetching TCP records:', err);
            setError('Terjadi kesalahan pada sistem saat memuat daftar TCP.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch shipments for dropdown
    const fetchShipments = async () => {
        if (!companyId) return;
        try {
            const data = await tcpService.getShipmentsForTcp(companyId);
            setShipments(data);
        } catch (err) {
            console.error('Error fetching shipments:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data pengiriman.');
        }
    };

    useEffect(() => {
        if (companyId) {
            fetchTcpRecords();
            fetchShipments();
        }
    }, [companyId]);

    // Load shipment details and system stock snapshot when shipment changes
    useEffect(() => {
        if (!selectedShipmentId) {
            setProductId('');
            setProductName('');
            setInvoiceNo('');
            setVesselName('');
            setShipmentQty(0);
            setTotalIn(0);
            setTotalOut(0);
            return;
        }

        const loadDetails = async () => {
            const shipment = shipments.find(s => s.id === selectedShipmentId);
            if (!shipment) return;

            setProductId(shipment.product_id);
            setProductName(shipment.master_products?.name || '');
            setInvoiceNo(shipment.invoice_no);
            setVesselName(shipment.vessel_name || '');
            setShipmentQty(Number(shipment.quantity) || 0);

            // Fetch current stock snapshot and ledger aggregations
            setLoadingDetails(true);
            try {
                const [ledgerTotals, directDeliveryTotal] = await Promise.all([
                    tcpService.getLedgerTotalsForProduct(shipment.product_id),
                    tcpService.getDirectDeliveryTotalForShipment(shipment.id)
                ]);
                setTotalIn(ledgerTotals.totalIn);
                setTotalOut(directDeliveryTotal);
            } catch (err) {
                console.error('Error loading shipment details:', err);
                setError('Gagal memuat detail stok untuk pengiriman terpilih.');
            } finally {
                setLoadingDetails(false);
            }
        };

        loadDetails();
    }, [selectedShipmentId, shipments]);

    // Open Add Dialog
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setSelectedRecord(null);
        setSelectedShipmentId('');
        setProductName('');
        setTcpValue('');
        setNotes('');
        setError(null);
        setOpenDialog(true);
    };

    // Open Edit Dialog
    const handleOpenEdit = (record: TcpRecord) => {
        setIsEditMode(true);
        setSelectedRecord(record);
        setSelectedShipmentId(record.shipment_id);

        // Populate fields from existing record
        setProductId(record.product_id);
        setProductName(record.master_products?.name || '');
        setInvoiceNo(record.shipments?.invoice_no || '');
        setVesselName(record.shipments?.vessel_name || '');
        setShipmentQty(Number(record.shipments?.quantity) || 0);
        setTotalIn(Number(record.total_in) || 0);
        setTotalOut(Number(record.total_out) || 0);
        setTcpValue(formatThousand(record.tcp_value));
        setNotes(record.notes || '');

        setError(null);
        setOpenDialog(true);
    };

    // Handle Form Submit (Standard Save / Edit)
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation Checks
        if (!selectedShipmentId) {
            setError('Silakan pilih pengiriman terlebih dahulu.');
            return;
        }

        const tcpNum = parseThousand(tcpValue);
        if (tcpValue.trim() === '' || tcpNum <= 0) {
            setError('Nilai Total TCP tidak boleh kosong atau nol.');
            return;
        }

        const trimmedNotes = notes.trim();
        if (containsHtmlOrScript(trimmedNotes)) {
            setError('Catatan mengandung karakter atau skrip yang tidak valid.');
            return;
        }

        if (isShipmentAlreadyConsolidated && !isEditMode) {
            setError('Data TCP sudah ada, silakan edit data yang ada.');
            return;
        }

        if (!companyId) {
            setError('Profil pengguna tidak valid.');
            return;
        }

        // Gunakan kalkulasi dari useMemo untuk target aktual stok
        const actualStockValue = stokAktual;

        setSubmitting(true);
        try {
            if (isEditMode && selectedRecord) {
                // Edit record
                await tcpService.updateTcpRecord({
                    id: selectedRecord.id,
                    inventory_adjustment_id: selectedRecord.inventory_adjustment_id,
                    tcp_value: tcpNum,
                    actual_stock: actualStockValue,
                    notes: trimmedNotes
                });
                setSuccessMsg('Data TCP berhasil diperbarui.');
            } else {
                // Create new record
                await tcpService.createTcpRecord({
                    company_id: companyId,
                    shipment_id: selectedShipmentId,
                    product_id: productId,
                    tcp_value: tcpNum,
                    total_in: totalIn,
                    total_out: totalOut,
                    actual_stock: actualStockValue,
                    current_stock_snapshot: stokSistemTeoritis,
                    notes: trimmedNotes
                });
                setSuccessMsg('Data TCP berhasil disimpan.');
            }

            setOpenDialog(false);
            await fetchTcpRecords();
            await fetchShipments(); // Refresh dropdown info/TCP references
        } catch (err) {
            console.error('Error saving TCP Input:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Resubmit for Rejected TCP Records
    const handleResubmit = async () => {
        if (!selectedRecord) return;
        setError(null);

        const tcpNum = parseThousand(tcpValue);
        if (tcpValue.trim() === '' || tcpNum <= 0) {
            setError('Nilai Total TCP tidak boleh kosong atau nol.');
            return;
        }

        const trimmedNotes = notes.trim();
        if (containsHtmlOrScript(trimmedNotes)) {
            setError('Catatan mengandung karakter atau skrip yang tidak valid.');
            return;
        }

        setSubmitting(true);
        try {
            // Calculate target actual stock for inventory adjustments
            const actualStockValue = stokAktual;

            // 1. Save any updated values
            await tcpService.updateTcpRecord({
                id: selectedRecord.id,
                inventory_adjustment_id: selectedRecord.inventory_adjustment_id,
                tcp_value: tcpNum,
                actual_stock: actualStockValue,
                notes: trimmedNotes
            });

            // 2. Perform resubmission (updates status to 'ON_REQUEST' and clears rejection notes)
            await tcpService.resubmitTcpRecord(selectedRecord.inventory_adjustment_id);

            setSuccessMsg('Permintaan TCP berhasil dikirim ulang.');
            setOpenDialog(false);
            await fetchTcpRecords();
            await fetchShipments();
        } catch (err) {
            console.error('Error resubmitting TCP:', err);
            setError('Terjadi kesalahan pada sistem saat mengirim ulang.');
        } finally {
            setSubmitting(false);
        }
    };

    // Superuser: Approve request directly
    const handleApprove = async (record: TcpRecord) => {
        if (!record.inventory_adjustment_id) return;
        setError(null);
        setSubmitting(true);
        try {
            await tcpService.approveTcpAdjustment(record.inventory_adjustment_id);
            setSuccessMsg('Data TCP disetujui.');
            await fetchTcpRecords();
            await fetchShipments();
        } catch (err) {
            console.error('Error approving TCP adjustment:', err);
            setError('Terjadi kesalahan pada sistem saat menyetujui data.');
        } finally {
            setSubmitting(false);
        }
    };

    // Superuser: Open rejection reason input Dialog
    const handleOpenReject = (record: TcpRecord) => {
        setRejectRecord(record);
        setRejectionNotesInput('');
        setError(null);
        setOpenRejectDialog(true);
    };

    // Superuser: Save Rejection notes
    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectRecord || !rejectRecord.inventory_adjustment_id) return;

        const trimmedRejectionNotes = rejectionNotesInput.trim();
        if (!trimmedRejectionNotes) {
            setError('Catatan penolakan wajib diisi.');
            return;
        }

        if (containsHtmlOrScript(trimmedRejectionNotes)) {
            setError('Catatan penolakan mengandung karakter atau skrip yang tidak valid.');
            return;
        }

        setSubmitting(true);
        try {
            await tcpService.rejectTcpAdjustment(
                rejectRecord.inventory_adjustment_id,
                trimmedRejectionNotes,
                profile?.uuid || ''
            );
            setSuccessMsg('Data TCP ditolak.');
            setOpenRejectDialog(false);
            await fetchTcpRecords();
            await fetchShipments();
        } catch (err) {
            console.error('Error rejecting TCP adjustment:', err);
            setError('Terjadi kesalahan pada sistem saat menolak data.');
        } finally {
            setSubmitting(false);
        }
    };

    // Check if form should be locked/disabled
    const isFormLocked = useMemo(() => {
        if (!isEditMode || !selectedRecord) return false;
        // Status check from the sync status in tcp_input or inventory_adjustments
        const status = selectedRecord.status || selectedRecord.inventory_adjustments?.status;
        return status === 'APPROVED';
    }, [isEditMode, selectedRecord]);

    // Format chip status
    const getStatusLabelAndColor = (statusVal: string) => {
        switch (statusVal) {
            case 'APPROVED':
                return { label: 'Diterima', color: 'success' as const };
            case 'REJECTED':
                return { label: 'Ditolak', color: 'error' as const };
            case 'ON_REQUEST':
            default:
                return { label: 'Menunggu', color: 'warning' as const };
        }
    };

    // Data grid columns
    const columns = useMemo<MRT_ColumnDef<TcpRecord>[]>(() => [
        {
            accessorKey: 'shipments.invoice_no',
            header: 'No. Invoice',
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'shipments.vessel_name',
            header: 'Nama Kapal / Vessel',
            size: 180,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'master_products.name',
            header: 'Produk',
            size: 180,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'shipments.quantity',
            header: 'Qty Shipment (Kg)',
            size: 150,
            Cell: ({ row }) => new Intl.NumberFormat('id-ID').format(row.original.shipments?.quantity || 0),
        },
        {
            accessorKey: 'tcp_value',
            header: 'Nilai Total TCP (Kg)',
            size: 150,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            accessorKey: 'total_out',
            header: 'Total Keluar (Kg)',
            size: 150,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            id: 'calculated_selisih',
            header: 'Selisih (Kg)',
            size: 150,
            Cell: ({ row }) => {
                const qty = row.original.shipments?.quantity || 0;
                const totalOut = row.original.total_out || 0;
                const tcp = row.original.tcp_value || 0;
                const calculated = qty - totalOut - tcp;

                const isDeficit = calculated > 0;
                const isSurplus = calculated < 0;
                const color = isDeficit ? '#ef4444' : isSurplus ? '#22c55e' : 'inherit';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {new Intl.NumberFormat('id-ID').format(calculated)}
                    </span>
                );
            }
        },
        {
            accessorKey: 'inventory_adjustments.status',
            header: 'Status Approval',
            size: 150,
            Cell: ({ cell }) => {
                const status = cell.getValue<string>() || 'ON_REQUEST';
                const { label, color } = getStatusLabelAndColor(status);
                return (
                    <Chip
                        label={label}
                        color={color}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            },
        },
        {
            accessorKey: 'created_at',
            header: 'Dibuat Pada',
            size: 180,
            Cell: ({ cell }) => {
                const val = cell.getValue<string>();
                if (!val) return '-';
                try {
                    return new Date(val).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch {
                    return val;
                }
            }
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: records,
        state: {
            isLoading: loading,
            showProgressBars: loading || submitting,
        },
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => {
            const status = row.original.inventory_adjustments?.status || 'ON_REQUEST';

            // Superuser approval and rejection options
            if (isSuperuser && status === 'ON_REQUEST') {
                return (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckIcon />}
                            disabled={submitting}
                            onClick={() => handleApprove(row.original)}
                            sx={{ textTransform: 'none', borderRadius: '15px' }}
                        >
                            Setujui Data
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<BlockIcon />}
                            disabled={submitting}
                            onClick={() => handleOpenReject(row.original)}
                            sx={{ textTransform: 'none', borderRadius: '15px' }}
                        >
                            Tolak Data
                        </Button>
                    </Box>
                );
            }

            // Normal edit icon for view/edit access
            return (
                <Tooltip title={status === 'APPROVED' ? 'Detail (Terkunci)' : 'Ubah TCP'}>
                    <IconButton onClick={() => handleOpenEdit(row.original)} color="primary">
                        <EditIcon />
                    </IconButton>
                </Tooltip>
            );
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
        muiTableBodyRowProps: ({ row }) => {
            const status = row.original.inventory_adjustments?.status || 'ON_REQUEST';
            const isRejected = status === 'REJECTED';
            return {
                sx: {
                    backgroundColor: isRejected
                        ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.15) !important' : 'rgba(254, 226, 226, 0.6) !important')
                        : 'transparent',
                    '&:hover': {
                        backgroundColor: isRejected
                            ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.25) !important' : 'rgba(254, 226, 226, 0.8) !important')
                            : (mode === 'dark' ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.02) !important'),
                        transform: 'scale(1.001)',
                        transition: 'all 0.2s',
                        zIndex: 1,
                    },
                },
            };
        },
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
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    Input TCP (Konsolidasi Stok)
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAdd}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                        px: 3
                    }}
                >
                    Tambah Konsolidasi
                </Button>
            </Box>

            {error && !openDialog && !openRejectDialog && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <MaterialReactTable table={table} />

            {/* TCP Form Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => !submitting && setOpenDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)',
                        background: mode === 'dark'
                            ? 'rgba(30, 30, 30, 0.9)'
                            : 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }
                }}
            >
                <form onSubmit={handleFormSubmit}>
                    <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">
                            {isEditMode ? 'Ubah Data TCP' : 'Tambah Data TCP Baru'}
                        </Typography>
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpenDialog(false)}
                            disabled={submitting}
                            sx={{ color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ p: 3 }}>
                        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                        {selectedRecord?.inventory_adjustments?.status === 'REJECTED' && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                Data ditolak: {selectedRecord.inventory_adjustments.rejection_notes || 'Tidak ada catatan penolakan.'}
                            </Alert>
                        )}

                        {isFormLocked && (
                            <Alert severity="warning" sx={{ mb: 3 }}>
                                Data TCP ini telah disetujui oleh Superuser dan terkunci. Data tidak dapat diubah kembali.
                            </Alert>
                        )}

                        {isShipmentAlreadyConsolidated && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                Data TCP sudah ada, silakan edit data yang ada.
                            </Alert>
                        )}

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    select
                                    label="Pilih Shipment"
                                    fullWidth
                                    size="small"
                                    value={selectedShipmentId}
                                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                                    required
                                    disabled={isEditMode || submitting || isFormLocked}
                                >
                                    {shipments.map((ship) => (
                                        <MenuItem key={ship.id} value={ship.id}>
                                            {ship.invoice_no} - {ship.vessel_name || 'Tanpa Kapal'} {ship.id_tcp ? '(Sudah Ada TCP)' : ''}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {selectedShipmentId && (
                                <>
                                    <Grid size={{ xs: 12 }}>
                                        <Divider>
                                            <Chip label="Data Pengiriman" size="small" />
                                        </Divider>
                                    </Grid>

                                    {loadingDetails ? (
                                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                            <CircularProgress size={30} />
                                        </Grid>
                                    ) : (
                                        <>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Nama Produk"
                                                    fullWidth
                                                    size="small"
                                                    value={productName}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="No. Invoice"
                                                    fullWidth
                                                    size="small"
                                                    value={invoiceNo}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Nama Vessel"
                                                    fullWidth
                                                    size="small"
                                                    value={vesselName}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Kuantitas Pengiriman (Invoice)"
                                                    fullWidth
                                                    size="small"
                                                    value={`${shipmentQty.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Stok Sistem (Teoritis)"
                                                    fullWidth
                                                    size="small"
                                                    value={`${stokSistemTeoritis.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Total Masuk"
                                                    fullWidth
                                                    size="small"
                                                    value={`${totalIn.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    label="Total Keluar"
                                                    fullWidth
                                                    size="small"
                                                    value={`${totalOut.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                <Divider>
                                                    <Chip label="Input TCP & Penyesuaian" size="small" color="primary" />
                                                </Divider>
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                {selisih > 0 && tcpValue !== '' ? (
                                                    <Alert severity="error" sx={{ mb: 1 }}>
                                                        Indikasi Defisit (Penyusutan)
                                                    </Alert>
                                                ) : selisih < 0 && tcpValue !== '' ? (
                                                    <Alert severity="success" sx={{ mb: 1 }}>
                                                        Indikasi Surplus (Penambahan Stok)
                                                    </Alert>
                                                ) : null}
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    label="Nilai Total TCP"
                                                    type="text"
                                                    fullWidth
                                                    size="small"
                                                    required
                                                    placeholder="Masukkan Nilai Total TCP"
                                                    value={tcpValue}
                                                    onChange={(e) => setTcpValue(formatThousand(e.target.value))}
                                                    disabled={submitting || isFormLocked}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    label="Selisih"
                                                    fullWidth
                                                    size="small"
                                                    value={`${selisih.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                    error={selisih < 0}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    label="Stok Aktual (Final)"
                                                    fullWidth
                                                    size="small"
                                                    value={`${stokAktual.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    label="Catatan"
                                                    multiline
                                                    rows={3}
                                                    fullWidth
                                                    size="small"
                                                    placeholder="Jelaskan detail konsolidasi stok ini..."
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    disabled={submitting || isFormLocked}
                                                />
                                            </Grid>
                                        </>
                                    )}
                                </>
                            )}
                        </Grid>
                    </DialogContent>

                    <DialogActions sx={{ p: 2, px: 3 }}>
                        <Button
                            onClick={() => setOpenDialog(false)}
                            variant="outlined"
                            color="inherit"
                            disabled={submitting}
                            sx={{ borderRadius: '20px', textTransform: 'none' }}
                        >
                            Batal
                        </Button>

                        {selectedRecord?.inventory_adjustments?.status === 'REJECTED' && (
                            <Button
                                onClick={handleResubmit}
                                variant="contained"
                                color="warning"
                                disabled={submitting || loadingDetails}
                                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                sx={{ borderRadius: '20px', textTransform: 'none' }}
                            >
                                Kirim Ulang
                            </Button>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting || loadingDetails || !selectedShipmentId || isShipmentAlreadyConsolidated || isFormLocked || !tcpValue || parseThousand(tcpValue) <= 0}
                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            sx={{
                                borderRadius: '20px',
                                textTransform: 'none',
                                background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                            }}
                        >
                            Simpan
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Superuser Rejection Reason Dialog */}
            <Dialog
                open={openRejectDialog}
                onClose={() => !submitting && setOpenRejectDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)',
                        background: mode === 'dark'
                            ? 'rgba(30, 30, 30, 0.9)'
                            : 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }
                }}
            >
                <form onSubmit={handleRejectSubmit}>
                    <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">
                            Berikan Catatan Penolakan
                        </Typography>
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpenRejectDialog(false)}
                            disabled={submitting}
                            sx={{ color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ p: 3 }}>
                        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                        <TextField
                            label="Catatan Penolakan"
                            multiline
                            rows={4}
                            fullWidth
                            size="small"
                            required
                            placeholder="Tulis alasan penolakan di sini..."
                            value={rejectionNotesInput}
                            onChange={(e) => setRejectionNotesInput(e.target.value)}
                            disabled={submitting}
                        />
                    </DialogContent>

                    <DialogActions sx={{ p: 2, px: 3 }}>
                        <Button
                            onClick={() => setOpenRejectDialog(false)}
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
                            color="error"
                            disabled={submitting || !rejectionNotesInput.trim()}
                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CloseIcon />}
                            sx={{ borderRadius: '20px', textTransform: 'none' }}
                        >
                            Tolak Data
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

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

export default TcpInput;
