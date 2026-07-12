// TODO: Implement Role-Based Access Control here. Only allow specific roles to access.

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

const SalesReport = () => {
    const { profile } = useAuth();
    const { mode } = useColorMode();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;

    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>({});
    
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const fetchData = async () => {
        
        setLoading(true);
        try {
            const data = await reportService.getPenjualan(companyId, userRole, dateFilter);
            
            setTableData(data);
        } catch (err) {
            console.error('[SalesReport] Error fetching sales report:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [companyId, userRole, dateFilter]);

    const applyCustomDate = () => {
        if (startDate && endDate) {
            setDateFilter({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
        } else {
            setDateFilter({});
        }
    };

    const handleReset = () => {
        setStartDate(null);
        setEndDate(null);
        setDateFilter({});
    };

    const csvConfig = mkConfig({
        fieldSeparator: ',',
        decimalSeparator: '.',
        useKeysAsHeaders: true,
        filename: 'Laporan_Penjualan'
    });

    const handleExportData = () => {
        const exportData = tableData.map(row => ({
            'No. Order': row.order_no || '',
            'No. PO': row.po_number || '',
            'Produk': row.master_products?.name || '',
            'Customer': row.master_partners?.name || '',
            'Total Qty (Kg)': row.qty_ordered || 0,
            'Status': row.status || '',
            'Tanggal': row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : ''
        }));
        const csv = generateCsv(csvConfig)(exportData);
        download(csvConfig)(csv);
    };

    const columns = useMemo(() => [
        { 
            accessorKey: 'order_no', 
            header: 'No. Order' 
        },
        { 
            accessorKey: 'po_number', 
            header: 'No. PO' 
        },
        { 
            accessorKey: 'master_products.name', 
            header: 'Produk' 
        },
        { 
            accessorKey: 'master_partners.name', 
            header: 'Customer' 
        },
        { 
            accessorKey: 'qty_ordered', 
            header: 'Total Qty (Kg)', 
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(cell.getValue() || 0) 
        },
        { 
            accessorKey: 'status', 
            header: 'Status' 
        },
        { 
            accessorKey: 'created_at', 
            header: 'Tanggal', 
            Cell: ({ cell }: any) => new Date(cell.getValue()).toLocaleDateString('id-ID') 
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: tableData,
        state: { isLoading: loading },
        initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 }
        },
        paginationDisplayMode: 'pages',
        renderTopToolbarCustomActions: () => (
            <Button
                color="primary"
                onClick={handleExportData}
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
        <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Laporan Penjualan
                </Typography>
            </Box>

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
                    background: mode === 'dark'
                        ? 'rgba(0, 0, 0, 0.3)'
                        : 'rgba(255, 255, 255, 0.6)',
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
                <Button variant="outlined" onClick={applyCustomDate} sx={{ borderRadius: '20px', textTransform: 'none' }}>Tampilkan</Button>
                <Button variant="text" color="secondary" onClick={handleReset} sx={{ borderRadius: '20px', textTransform: 'none' }}>Reset</Button>
            </Paper>

            <MaterialReactTable table={table} />
        </Container>
    );
};

export default SalesReport;
