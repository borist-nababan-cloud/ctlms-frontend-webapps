import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Grid,
    Chip,
    Button,
    FormControlLabel,
    Checkbox,
    MenuItem,
    TextField
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { reportService, type DateFilter } from '../../lib/reportService';
import { deliveryService } from '../../lib/deliveryService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const StockReport = () => {
    const { profile } = useAuth();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;

    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>({});
    const [activeChip, setActiveChip] = useState<string>('All');

    // Date Picker States
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Filter stock !== 0 state
    const [showOnlyNonZeroStock, setShowOnlyNonZeroStock] = useState(false);

    // Mutasi Stock States
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [mutationData, setMutationData] = useState<any[]>([]);
    const [loadingMutations, setLoadingMutations] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const tData = await reportService.getCurrentStock(companyId, userRole);
            setTableData(tData);
        } catch (err) {
            console.error('[StockReport] Error fetching stock report data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [companyId, userRole, dateFilter]);

    // Load products on mount
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const prod = await deliveryService.getInternalProducts();
                setProducts(prod);
            } catch (err) {
                console.error('[StockReport] Error loading raw products:', err);
            }
        };
        loadProducts();
    }, []);

    // Load mutations when product changes
    useEffect(() => {
        if (!selectedProductId) {
            setMutationData([]);
            return;
        }

        const fetchMutations = async () => {
            setLoadingMutations(true);
            try {
                const data = await reportService.getStockMutations(selectedProductId, companyId, userRole);
                setMutationData(data);
            } catch (err) {
                console.error('[StockReport] Error fetching mutations:', err);
            } finally {
                setLoadingMutations(false);
            }
        };

        fetchMutations();
    }, [selectedProductId, companyId, userRole]);

    const handleChipFilter = (filter: string) => {
        setActiveChip(filter);
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = now;

        if (filter === 'Minggu Ini') {
            const day = now.getDay() || 7; 
            if (day !== 1) now.setHours(-24 * (day - 1)); 
            start = new Date(now);
        } else if (filter === 'Bulan Ini') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filter === 'Tahun Ini') {
            start = new Date(now.getFullYear(), 0, 1);
        } else {
            start = null;
            end = null;
            setStartDate(null);
            setEndDate(null);
        }

        if (start && end) {
            setStartDate(start);
            setEndDate(end);
            setDateFilter({
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            });
        } else {
            setDateFilter({});
        }
    };

    const applyCustomDate = () => {
        setActiveChip('Custom');
        if (startDate && endDate) {
            setDateFilter({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
        }
    };

    const csvConfig = mkConfig({
        fieldSeparator: ',',
        decimalSeparator: '.',
        useKeysAsHeaders: true,
        filename: 'Laporan_Stok'
    });

    // Filtered table data for table & CSV export
    const filteredTableData = useMemo(() => {
        if (showOnlyNonZeroStock) {
            return tableData.filter(row => (row.current_stock_kg || 0) !== 0);
        }
        return tableData;
    }, [tableData, showOnlyNonZeroStock]);

    const handleExportData = () => {
        const exportData = filteredTableData.map((row) => ({
            'Produk': row.product_name,
            'Stok (Kg)': row.current_stock_kg,
            'Terakhir Diperbarui': row.last_updated
        }));
        const csv = generateCsv(csvConfig)(exportData);
        download(csvConfig)(csv);
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'product_name',
            header: 'Nama Produk',
        },
        {
            accessorKey: 'current_stock_kg',
            header: 'Stok Saat Ini (Kg)',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(cell.getValue() || 0)
        },
        {
            accessorKey: 'last_updated',
            header: 'Pembaruan Terakhir',
            Cell: ({ cell }: any) => {
                const val = cell.getValue();
                return val ? new Date(val).toLocaleString('id-ID') : '-';
            }
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: filteredTableData,
        state: { isLoading: loading },
        renderTopToolbarCustomActions: () => (
            <Button
                color="primary"
                onClick={handleExportData}
                startIcon={<FileDownloadIcon />}
                variant="contained"
            >
                Ekspor CSV
            </Button>
        ),
    });

    // Mutasi Stock table columns and hook
    const mutationColumns = useMemo(() => [
        {
            accessorKey: 'created_at',
            header: 'Tanggal',
            Cell: ({ cell }: any) => {
                const val = cell.getValue();
                return val ? new Date(val).toLocaleString('id-ID', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '-';
            }
        },
        {
            accessorKey: 'transaction_type',
            header: 'Tipe Transaksi',
            Cell: ({ cell }: any) => {
                const val = cell.getValue();
                if (val === 'TALLY_IN') return <Chip label="Pembelian" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
                if (val === 'SALES_OUT') return <Chip label="Penjualan" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
                if (val === 'ADJUSTMENT') return <Chip label="Penyesuaian" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
                return val;
            }
        },
        {
            accessorKey: 'qty_change',
            header: 'Jumlah (Kg)',
            Cell: ({ cell }: any) => {
                const val = Number(cell.getValue()) || 0;
                const isPositive = val > 0;
                const prefix = isPositive ? '+' : '';
                const color = isPositive ? '#22c55e' : '#ef4444';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {prefix}{new Intl.NumberFormat('id-ID').format(val)}
                    </span>
                );
            }
        },
        {
            accessorKey: 'detail_label',
            header: 'Referensi (Vessel / Surat Jalan)',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'notes',
            header: 'Catatan',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        }
    ], []);

    const mutationTable = useMaterialReactTable({
        columns: mutationColumns,
        data: mutationData,
        state: { isLoading: loadingMutations },
        enableRowSelection: false,
        enableFilters: true,
        enableGlobalFilter: true,
        renderTopToolbarCustomActions: () => {
            const handleExportMutation = () => {
                const config = mkConfig({
                    fieldSeparator: ',',
                    decimalSeparator: '.',
                    useKeysAsHeaders: true,
                    filename: 'Mutasi_Stok'
                });
                const exportData = mutationData.map((row) => ({
                    'Tanggal': row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '',
                    'Tipe Transaksi': row.transaction_type,
                    'Jumlah (Kg)': row.qty_change,
                    'Referensi': row.detail_label,
                    'Catatan': row.notes
                }));
                const csv = generateCsv(config)(exportData);
                download(config)(csv);
            };
            return (
                <Button
                    color="primary"
                    onClick={handleExportMutation}
                    startIcon={<FileDownloadIcon />}
                    variant="contained"
                    disabled={mutationData.length === 0}
                >
                    Ekspor CSV Mutasi
                </Button>
            );
        }
    });

    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                Laporan Stok (INTERNAL RAW)
            </Typography>

            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ mr: 2 }}>Filter Tanggal:</Typography>
                <Chip label="Semua" onClick={() => handleChipFilter('All')} color={activeChip === 'All' ? 'primary' : 'default'} />
                <Chip label="Minggu Ini" onClick={() => handleChipFilter('Minggu Ini')} color={activeChip === 'Minggu Ini' ? 'primary' : 'default'} />
                <Chip label="Bulan Ini" onClick={() => handleChipFilter('Bulan Ini')} color={activeChip === 'Bulan Ini' ? 'primary' : 'default'} />
                <Chip label="Tahun Ini" onClick={() => handleChipFilter('Tahun Ini')} color={activeChip === 'Tahun Ini' ? 'primary' : 'default'} />
                
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showOnlyNonZeroStock}
                            onChange={(e) => setShowOnlyNonZeroStock(e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Tampilkan Stok ≠ 0 saja"
                    sx={{ ml: 2 }}
                />

                <Box sx={{ flexGrow: 1 }} />
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker 
                        label="Start Date" 
                        value={startDate} 
                        onChange={(newValue) => setStartDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker 
                        label="End Date" 
                        value={endDate} 
                        onChange={(newValue) => setEndDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={applyCustomDate}>Tampilkan</Button>
            </Paper>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <MaterialReactTable table={table} />
                </Grid>
            </Grid>

            {/* Mutasi Stock Section */}
            <Paper sx={{ p: 3, mt: 4, borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)' }}>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Mutasi Stock
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            label="Pilih Produk Internal (Raw)"
                            fullWidth
                            size="small"
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                            {products.map(p => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                {selectedProductId ? (
                    <MaterialReactTable table={mutationTable} />
                ) : (
                    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1">Silakan pilih produk terlebih dahulu untuk melihat mutasi stok.</Typography>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default StockReport;
