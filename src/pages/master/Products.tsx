import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { masterService } from '../../lib/masterService';
import type { MasterProduct } from '../../types/supabase';
import { containsHtmlOrScript } from '../../lib/sanitizer';

const Products = () => {
    const { mode } = useColorMode();
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);

    // Dialog State
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<MasterProduct>>({
        sku_code: '',
        name: '',
        type: 'INTERNAL_RAW',
        current_price: 0
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await masterService.getProducts();
            setProducts(data);
        } catch (err: any) {
            console.error('Error loading products:', err);
            setError('Gagal memuat data produk.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // MRT Columns
    const columns = useMemo<MRT_ColumnDef<MasterProduct>[]>(() => [
        {
            accessorKey: 'sku_code',
            header: 'Kode SKU',
            size: 100,
            enableClickToCopy: true,
        },
        {
            accessorKey: 'name',
            header: 'Nama Produk',
            size: 200,
        },
        {
            accessorKey: 'type',
            header: 'Tipe',
            size: 150,
            filterVariant: 'select',
            filterSelectOptions: ['INTERNAL_RAW', 'PUBLISHED_FINISHED'],
            Cell: ({ cell }) => cell.getValue<string>() === 'INTERNAL_RAW' ? 'Bahan Baku Internal (Raw)' : 'Produk Jadi Publik (Finished)',
        },
        {
            accessorKey: 'current_price',
            header: 'Harga / Kg',
            size: 150,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(cell.getValue<number>()),
        },
    ], []);

    // Handlers
    const handleOpen = () => {
        setEditingId(null);
        setFormData({ sku_code: '', name: '', type: 'INTERNAL_RAW', current_price: 0 });
        setDialogError(null);
        setOpen(true);
    };

    const handleEdit = (product: MasterProduct) => {
        setEditingId(product.id);
        setFormData(product);
        setDialogError(null);
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleSubmit = async () => {
        setDialogError(null);
        const trimmedSku = formData.sku_code?.trim() || '';
        const trimmedName = formData.name?.trim() || '';

        if (!trimmedSku || !trimmedName) {
            setDialogError('Kode SKU dan Nama Produk wajib diisi.');
            return;
        }

        if (containsHtmlOrScript(trimmedSku) || containsHtmlOrScript(trimmedName)) {
            setDialogError('Input mengandung karakter tidak valid atau script berbahaya');
            return;
        }

        const payload = {
            ...formData,
            sku_code: trimmedSku,
            name: trimmedName,
        };

        try {
            if (editingId) {
                await masterService.updateProduct(editingId, payload);
            } else {
                await masterService.createProduct(payload as any);
            }
            setOpen(false);
            fetchProducts();
        } catch (err: any) {
            console.error('Error saving product:', err);
            setDialogError('Terjadi kesalahan pada sistem saat menyimpan data.');
        }
    };

    const table = useMaterialReactTable({
        columns,
        data: products,
        state: {
            isLoading: loading,
            showProgressBars: loading,
        },
        enableRowSelection: true,
        enableColumnFilterModes: true,
        enableColumnOrdering: true,
        enableGrouping: true,
        enablePinning: true,
        enableRowActions: true,
        initialState: {
            showColumnFilters: true,
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 }
        },
        paginationDisplayMode: 'pages',
        positionToolbarAlertBanner: 'bottom',
        muiSearchTextFieldProps: {
            size: 'small',
            variant: 'outlined',
        },
        muiPaginationProps: {
            color: 'primary',
            rowsPerPageOptions: [10, 20, 50],
            shape: 'rounded',
            variant: 'outlined',
        },
        renderRowActions: ({ row }) => (
            <Button
                color="primary"
                onClick={() => handleEdit(row.original)}
                startIcon={<EditIcon />}
                size="small"
            >
                Ubah
            </Button>
        ),
        // Futuristic Glass Theme Props
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            },
        },
    });

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Master Produk
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .3)',
                    }}
                >
                    Tambah Produk
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <MaterialReactTable table={table} />

            {/* Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle>{editingId ? 'Ubah Produk' : 'Tambah Produk Baru'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {dialogError && <Alert severity="error">{dialogError}</Alert>}
                        <TextField
                            label="Kode SKU"
                            fullWidth
                            value={formData.sku_code}
                            onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                        />
                        <TextField
                            label="Nama Produk"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            select
                            label="Tipe"
                            fullWidth
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        >
                            <MenuItem value="INTERNAL_RAW">Bahan Baku Internal (Raw)</MenuItem>
                            <MenuItem value="PUBLISHED_FINISHED">Produk Jadi Publik (Finished)</MenuItem>
                        </TextField>
                        <TextField
                            label="Harga per Kg (IDR)"
                            type="number"
                            fullWidth
                            value={formData.current_price}
                            onChange={(e) => setFormData({ ...formData, current_price: Number(e.target.value) })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Batal</Button>
                    <Button onClick={handleSubmit} variant="contained" sx={{ background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)' }}>Simpan</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Products;
