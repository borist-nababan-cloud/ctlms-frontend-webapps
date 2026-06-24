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
    Card,
    CardContent,
    Grid,
    Divider,
    Stack
} from '@mui/material';
import {
    Save as SaveIcon,
    Check as CheckIcon,
    Close as RejectIcon
} from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { containsHtmlOrScript } from '../../lib/sanitizer';
import { inventoryAdjustmentService, type InventoryAdjustmentRecord } from '../../lib/inventoryAdjustmentService';

const InventoryAdjustment = () => {
    const { mode } = useColorMode();
    const { profile } = useAuth();
    
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;
    const isSuperuser = userRole === 1 || userRole === 8;

    // Common UI States
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    // Superuser Approval View States
    const [adjustments, setAdjustments] = useState<InventoryAdjustmentRecord[]>([]);

    // Requester Form View States
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [systemStock, setSystemStock] = useState<number>(0);
    const [loadingStock, setLoadingStock] = useState(false);
    const [actualStock, setActualStock] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Load Superuser Adjustment list
    const fetchAdjustments = async () => {
        try {
            setLoading(true);
            const data = await inventoryAdjustmentService.getPendingAdjustments();
            setAdjustments(data);
        } catch (err) {
            console.error('Error fetching pending adjustments:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data persetujuan.');
        } finally {
            setLoading(false);
        }
    };

    // Load Requester raw products dropdown
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await inventoryAdjustmentService.getProductsForAdjustment();
            setProducts(data);
        } catch (err) {
            console.error('Error fetching products for dropdown:', err);
            setError('Terjadi kesalahan pada sistem saat memuat daftar produk.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!profile) return;
        
        const initView = async () => {
            if (isSuperuser) {
                await fetchAdjustments();
            } else {
                await fetchProducts();
            }
        };
        initView();
    }, [profile, isSuperuser]);

    // Handle selected product current stock lookup
    useEffect(() => {
        if (!selectedProductId) {
            setSystemStock(0);
            return;
        }

        const fetchSystemStock = async () => {
            setLoadingStock(true);
            try {
                const stock = await inventoryAdjustmentService.getCurrentStockForProduct(selectedProductId);
                setSystemStock(stock);
            } catch (err) {
                console.error('Error querying product stock:', err);
                setSystemStock(0);
            } finally {
                setLoadingStock(false);
            }
        };

        fetchSystemStock();
    }, [selectedProductId]);

    // Requester submit request handler
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedProductId) {
            setError('Silakan pilih produk terlebih dahulu.');
            return;
        }

        const parsedActualStock = Number(actualStock);
        if (isNaN(parsedActualStock) || actualStock.trim() === '' || parsedActualStock < 0) {
            setError('Stok fisik harus berupa angka positif.');
            return;
        }

        const trimmedNotes = notes.trim();
        if (!trimmedNotes) {
            setError('Catatan wajib diisi.');
            return;
        }

        if (containsHtmlOrScript(trimmedNotes)) {
            setError('Catatan mengandung karakter atau skrip yang tidak valid.');
            return;
        }

        if (!profile?.company_id) {
            setError('Profil pengguna tidak memiliki data perusahaan yang valid.');
            return;
        }

        setSubmitting(true);
        try {
            await inventoryAdjustmentService.submitAdjustmentRequest({
                company_id: profile.company_id,
                product_id: selectedProductId,
                current_stock_snapshot: systemStock,
                actual_stock: parsedActualStock,
                notes: trimmedNotes
            });

            // Reset form states
            setSelectedProductId('');
            setActualStock('');
            setNotes('');
            setSystemStock(0);
            setSuccessMsg('Permintaan penyesuaian stok berhasil dikirim.');
        } catch (err) {
            console.error('Error submitting adjustment:', err);
            setError('Terjadi kesalahan pada sistem saat mengirim permintaan.');
        } finally {
            setSubmitting(false);
        }
    };

    // Approval handlers for Superusers
    const handleApprove = async (adjustmentId: string) => {
        if (!profile?.uuid) return;
        setError(null);
        setSubmitting(true);
        try {
            await inventoryAdjustmentService.approveAdjustment(adjustmentId, profile.uuid);
            setSuccessMsg('Permintaan penyesuaian stok disetujui.');
            await fetchAdjustments();
        } catch (err) {
            console.error('Error approving adjustment:', err);
            setError('Terjadi kesalahan pada sistem saat memproses persetujuan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async (adjustmentId: string) => {
        if (!profile?.uuid) return;
        setError(null);
        setSubmitting(true);
        try {
            await inventoryAdjustmentService.rejectAdjustment(adjustmentId, profile.uuid);
            setSuccessMsg('Permintaan penyesuaian stok ditolak.');
            await fetchAdjustments();
        } catch (err) {
            console.error('Error rejecting adjustment:', err);
            setError('Terjadi kesalahan pada sistem saat menolak permintaan.');
        } finally {
            setSubmitting(false);
        }
    };

    // Superuser approval table columns
    const columns = useMemo<MRT_ColumnDef<InventoryAdjustmentRecord>[]>(() => [
        {
            accessorKey: 'product_name',
            header: 'Nama Produk',
            size: 200,
        },
        {
            accessorKey: 'current_stock_snapshot',
            header: 'Stok Sistem (Kg)',
            size: 150,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            accessorKey: 'actual_stock',
            header: 'Stok Fisik (Kg)',
            size: 150,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            id: 'calculated_selisih',
            header: 'Selisih (Kg)',
            size: 150,
            Cell: ({ row }) => {
                const system = row.original.current_stock_snapshot || 0;
                const actual = row.original.actual_stock || 0;
                const calculated = system - actual;

                // If System > Actual (calculated > 0), there is a deficit of stock (Red)
                // If System < Actual (calculated < 0), there is a surplus of stock (Green)
                const color = calculated > 0 ? '#ef4444' : calculated < 0 ? '#22c55e' : 'inherit';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {new Intl.NumberFormat('id-ID').format(calculated)}
                    </span>
                );
            }
        },
        {
            accessorKey: 'notes',
            header: 'Catatan',
            size: 250,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            size: 130,
            Cell: () => (
                <Chip
                    label="ON_REQUEST"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            ),
        },
        {
            accessorKey: 'requester_name',
            header: 'Dibuat Oleh',
            size: 180,
            Cell: ({ row }) => row.original.requester_name || '-',
        },
        {
            accessorKey: 'created_at',
            header: 'Dibuat Pada',
            size: 180,
            Cell: ({ row }) => {
                const dateStr = row.original.created_at;
                if (!dateStr) return '-';
                try {
                    return new Date(dateStr).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch {
                    return dateStr;
                }
            }
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: adjustments,
        state: {
            isLoading: loading,
            showProgressBars: loading || submitting,
        },
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => (
            <Stack direction="row" spacing={1}>
                <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                    disabled={submitting}
                    onClick={() => handleApprove(row.original.id)}
                    sx={{ textTransform: 'none', borderRadius: '15px' }}
                >
                    {submitting ? 'Memproses...' : 'Setujui'}
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<RejectIcon />}
                    disabled={submitting}
                    onClick={() => handleReject(row.original.id)}
                    sx={{ textTransform: 'none', borderRadius: '15px' }}
                >
                    Tolak
                </Button>
            </Stack>
        ),
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

    if (!profile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
            {isSuperuser ? (
                // SUPERUSER VIEW: Approval Dashboard
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 'bold',
                                background: 'linear-gradient(45deg, #F59E0B 30%, #EF4444 90%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            Daftar Persetujuan Penyesuaian Stok
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <MaterialReactTable table={table} />
                </Box>
            ) : (
                // REQUESTER VIEW: Request Form
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Card
                        sx={{
                            maxWidth: 600,
                            width: '100%',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            background: mode === 'dark'
                                ? 'rgba(30, 30, 30, 0.7)'
                                : 'rgba(255, 255, 255, 0.85)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                        }}
                    >
                        <CardContent sx={{ p: 4 }}>
                            <Typography
                                variant="h5"
                                gutterBottom
                                sx={{
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    textAlign: 'center',
                                    mb: 3
                                }}
                            >
                                Permintaan Penyesuaian Stok
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <Box component="form" onSubmit={handleFormSubmit}>
                                    {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                                    <Stack spacing={3}>
                                        <TextField
                                            select
                                            label="Pilih Produk"
                                            fullWidth
                                            size="small"
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                            required
                                        >
                                            {products.map(p => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    {p.name} ({p.sku_code})
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 6 }}>
                                                <TextField
                                                    label="Stok Sistem"
                                                    fullWidth
                                                    size="small"
                                                    value={loadingStock ? 'Memuat...' : `${systemStock.toLocaleString('id-ID')} Kg`}
                                                    disabled
                                                    InputProps={{ readOnly: true }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 6 }}>
                                                <TextField
                                                    label="Stok Fisik"
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                    placeholder="e.g. 5000"
                                                    value={actualStock}
                                                    onChange={(e) => setActualStock(e.target.value)}
                                                    required
                                                    disabled={submitting}
                                                    helperText="Masukkan berat stok fisik dalam Kg"
                                                />
                                            </Grid>
                                        </Grid>

                                        <TextField
                                            label="Catatan"
                                            multiline
                                            rows={4}
                                            fullWidth
                                            size="small"
                                            placeholder="Jelaskan alasan dilakukannya penyesuaian stok..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            required
                                            disabled={submitting}
                                        />

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            disabled={submitting || loadingStock || !selectedProductId}
                                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                            sx={{
                                                borderRadius: '20px',
                                                textTransform: 'none',
                                                py: 1,
                                                background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                                            }}
                                        >
                                            {submitting ? 'Mengirim...' : 'Simpan Permintaan'}
                                        </Button>
                                    </Stack>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            )}

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

export default InventoryAdjustment;
