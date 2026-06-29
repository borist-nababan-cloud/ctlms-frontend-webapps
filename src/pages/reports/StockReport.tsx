import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Button
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { reportService, type DateFilter } from '../../lib/reportService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const StockReport = () => {
    const { profile } = useAuth();
    const { mode } = useColorMode();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;

    // --- Section 1: Riwayat Pergerakan Stok ---
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const [dateFilter, setDateFilter] = useState<DateFilter>({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const fetchHistoryData = async () => {
        setLoadingHistory(true);
        try {
            const data = await reportService.getStockMovementHistory(companyId, userRole, dateFilter);
            setHistoryData(data);
        } catch (err) {
            console.error('[StockReport] Error fetching movement history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistoryData();
    }, [companyId, userRole, dateFilter]);

    const applyHistoryDate = () => {
        if (startDate && endDate) {
            setDateFilter({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
        }
    };

    const csvConfigHistory = mkConfig({
        fieldSeparator: ',',
        decimalSeparator: '.',
        useKeysAsHeaders: true,
        filename: 'Riwayat_Pergerakan_Stok'
    });

    const handleExportHistory = () => {
        const exportData = historyData.map(row => ({
            'Tanggal': row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '',
            'Tipe': row.transaction_type || '',
            'Nama Produk': row.product_name || '',
            'Qty (Kg)': row.qty_change || 0,
            'No. SJ': row.sj_number || '',
            'Customer': row.customer_name || '',
            'Supplier': row.supplier_name || ''
        }));
        const csv = generateCsv(csvConfigHistory)(exportData);
        download(csvConfigHistory)(csv);
    };

    const historyColumns = useMemo(() => [
        {
            accessorKey: 'created_at',
            header: 'Tanggal',
            Cell: ({ cell }: any) => {
                const val = cell.getValue();
                return val ? new Date(val).toLocaleString('id-ID', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : '-';
            }
        },
        {
            accessorKey: 'transaction_type',
            header: 'Tipe'
        },
        {
            accessorKey: 'product_name',
            header: 'Nama Produk'
        },
        {
            accessorKey: 'qty_change',
            header: 'Qty (Kg)',
            Cell: ({ cell }: any) => {
                const val = Number(cell.getValue()) || 0;
                const isPositive = val > 0;
                const prefix = isPositive ? '+' : '';
                const color = isPositive ? '#22c55e' : '#ef4444';
                return (
                    <strong style={{ color }}>
                        {prefix}{new Intl.NumberFormat('id-ID').format(val)}
                    </strong>
                );
            }
        },
        {
            accessorKey: 'sj_number',
            header: 'No. SJ',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        }
    ], []);

    const historyTable = useMaterialReactTable({
        columns: historyColumns,
        data: historyData,
        state: { isLoading: loadingHistory },
        initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 }
        },
        paginationDisplayMode: 'pages',
        renderTopToolbarCustomActions: () => (
            <Button
                color="primary"
                onClick={handleExportHistory}
                startIcon={<FileDownloadIcon />}
                variant="contained"
                sx={{
                    borderRadius: '20px',
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .3)',
                }}
            >
                Ekspor CSV
            </Button>
        ),
        muiTablePaperProps: {
            elevation: 0,
            sx: {
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                background: mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                overflow: 'hidden',
            },
        },
        muiTableBodyRowProps: () => ({
            sx: {
                backgroundColor: 'transparent',
                '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.02) !important',
                    transform: 'scale(1.001)',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1,
                },
            },
        }),
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 247, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                color: mode === 'dark' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            },
        },
    });

    // --- Section 2: Stok Per Tanggal ---
    const [stockByDateData, setStockByDateData] = useState<any[]>([]);
    const [loadingStockByDate, setLoadingStockByDate] = useState(false);
    const [selectedStockDate, setSelectedStockDate] = useState<Date | null>(new Date());
    const [stockDateStr, setStockDateStr] = useState<string>(new Date().toISOString().split('T')[0]);

    const fetchStockByDateData = async () => {
        setLoadingStockByDate(true);
        try {
            const data = await reportService.getStockByDate(companyId, userRole, stockDateStr);
            setStockByDateData(data);
        } catch (err) {
            console.error('[StockReport] Error fetching stock by date:', err);
        } finally {
            setLoadingStockByDate(false);
        }
    };

    useEffect(() => {
        fetchStockByDateData();
    }, [companyId, userRole, stockDateStr]);

    const applyStockDate = () => {
        if (selectedStockDate) {
            setStockDateStr(selectedStockDate.toISOString().split('T')[0]);
        }
    };

    const csvConfigStockByDate = mkConfig({
        fieldSeparator: ',',
        decimalSeparator: '.',
        useKeysAsHeaders: true,
        filename: 'Stok_Per_Tanggal'
    });

    const handleExportStockByDate = () => {
        const exportData = stockByDateData.map(row => ({
            'Nama Produk': row.product_name || '',
            'Stok Sistem (Tanggal Terpilih)': row.stock || 0
        }));
        const csv = generateCsv(csvConfigStockByDate)(exportData);
        download(csvConfigStockByDate)(csv);
    };

    const stockByDateColumns = useMemo(() => [
        {
            accessorKey: 'product_name',
            header: 'Nama Produk'
        },
        {
            accessorKey: 'stock',
            header: 'Stok Sistem (Tanggal Terpilih)',
            Cell: ({ cell }: any) => (
                <strong>{new Intl.NumberFormat('id-ID').format(cell.getValue() || 0)}</strong>
            )
        }
    ], []);

    const stockByDateTable = useMaterialReactTable({
        columns: stockByDateColumns,
        data: stockByDateData,
        state: { isLoading: loadingStockByDate },
        initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 }
        },
        paginationDisplayMode: 'pages',
        renderTopToolbarCustomActions: () => (
            <Button
                color="primary"
                onClick={handleExportStockByDate}
                startIcon={<FileDownloadIcon />}
                variant="contained"
                sx={{
                    borderRadius: '20px',
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .3)',
                }}
            >
                Ekspor CSV
            </Button>
        ),
        muiTablePaperProps: {
            elevation: 0,
            sx: {
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                background: mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                overflow: 'hidden',
            },
        },
        muiTableBodyRowProps: () => ({
            sx: {
                backgroundColor: 'transparent',
                '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.02) !important',
                    transform: 'scale(1.001)',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1,
                },
            },
        }),
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 247, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                color: mode === 'dark' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            },
        },
    });

    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
            {/* Section 1 */}
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Riwayat Pergerakan Stok
            </Typography>

            <Paper 
                elevation={0}
                sx={{ 
                    p: 2, 
                    mb: 3, 
                    display: 'flex', 
                    gap: 2, 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    background: mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.08)'
                }}
            >
                <Typography variant="subtitle2" sx={{ mr: 1 }}>Filter Tanggal:</Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker 
                        label="Tanggal Mulai" 
                        value={startDate} 
                        onChange={(newValue) => setStartDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker 
                        label="Tanggal Akhir" 
                        value={endDate} 
                        onChange={(newValue) => setEndDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={applyHistoryDate} sx={{ borderRadius: '20px', textTransform: 'none' }}>Tampilkan</Button>
            </Paper>

            <Box sx={{ mb: 6 }}>
                <MaterialReactTable table={historyTable} />
            </Box>

            {/* Section 2 */}
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Stok per Tanggal (Stok Sistem)
            </Typography>
            
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2, 
                    mb: 3, 
                    display: 'flex', 
                    gap: 2, 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    background: mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.08)'
                }}
            >
                <Typography variant="subtitle2" sx={{ mr: 1 }}>Pilih Tanggal Stok:</Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker 
                        label="Pilih Tanggal Stok" 
                        value={selectedStockDate} 
                        onChange={(newValue) => setSelectedStockDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={applyStockDate} sx={{ borderRadius: '20px', textTransform: 'none', color: '#6366F1', borderColor: '#6366F1' }}>Tampilkan</Button>
            </Paper>

            <Box>
                <MaterialReactTable table={stockByDateTable} />
            </Box>

        </Container>
    );
};

export default StockReport;
