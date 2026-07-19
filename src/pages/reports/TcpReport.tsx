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

const TcpReport = () => {
    const { profile } = useAuth();
    const { mode } = useColorMode();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;

    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await reportService.getTcp(companyId, userRole, dateFilter);
            setTableData(data);
        } catch (err) {
            console.error('[TcpReport] Error fetching TCP report:', err);
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
        }
    };

    const csvConfig = mkConfig({
        fieldSeparator: ',',
        decimalSeparator: '.',
        useKeysAsHeaders: true,
        filename: 'Laporan_TCP'
    });

    const getDifference = (row: any) => {
        const selisih = row.difference ?? row.selisih;
        if (selisih !== undefined && selisih !== null) return Number(selisih);
        return (Number(row.actual_stock) || 0) - (Number(row.current_stock_snapshot) || Number(row.system_stock) || 0);
    };

    const handleExportData = () => {
        const exportData = tableData.map(row => ({
            'Tanggal': row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
            'No. Invoice': row.invoice_no || '-',
            'Supplier': row.supplier_name || '-',
            'Nama Vessel': row.vessel_name || '-',
            'Nama Produk': row.product_name || '-',
            'Qty Invoice': row.qty_invoice || 0,
            'Qty TCP': row.tcp_value || row.qty_tcp || 0,
            'Total Keluar': row.total_out || 0,
            'Stok Sistem': row.current_stock_snapshot || row.system_stock || 0,
            'Stok Aktual': row.actual_stock || 0,
            'Selisih': getDifference(row),
            'Dibuat Oleh': row.user_create || '-',
            'Disetujui Oleh': row.user_approve || '-',
            'Notes': row.notes || '-'
        }));
        const csv = generateCsv(csvConfig)(exportData);
        download(csvConfig)(csv);
    };

    const columns = useMemo(() => [
        { 
            accessorKey: 'created_at', 
            header: 'Dibuat Pada', 
            Cell: ({ cell }: any) => {
                const val = cell.getValue();
                if (!val) return '-';
                const date = new Date(val);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            }
        },
        { 
            accessorKey: 'invoice_no', 
            header: 'No. Invoice',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'supplier_name', 
            header: 'Supplier',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'vessel_name', 
            header: 'Nama Vessel',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'product_name', 
            header: 'Nama Produk',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'qty_invoice',
            header: 'Qty Invoice',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(Number(cell.getValue()) || 0)
        },
        {
            id: 'qty_tcp',
            accessorFn: (row: any) => row.tcp_value ?? row.qty_tcp,
            header: 'Qty TCP',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(Number(cell.getValue()) || 0)
        },
        {
            accessorKey: 'total_out',
            header: 'Total Keluar',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(Number(cell.getValue()) || 0)
        },
        {
            id: 'system_stock',
            accessorFn: (row: any) => row.current_stock_snapshot ?? row.system_stock,
            header: 'Stok Sistem',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(Number(cell.getValue()) || 0)
        },
        {
            accessorKey: 'actual_stock',
            header: 'Stok Aktual',
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(Number(cell.getValue()) || 0)
        },
        { 
            id: 'selisih', 
            header: 'Selisih', 
            accessorFn: (row: any) => getDifference(row),
            Cell: ({ cell }: any) => {
                const val = Number(cell.getValue());
                const color = val > 0 ? '#4caf50' : val < 0 ? '#f44336' : 'inherit';
                const prefix = val > 0 ? '+' : '';
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {prefix}{new Intl.NumberFormat('id-ID').format(val)}
                    </span>
                );
            }
        },
        {
            accessorKey: 'user_create',
            header: 'Dibuat Oleh',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'user_approve',
            header: 'Disetujui Oleh',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'notes',
            header: 'Notes',
            Cell: ({ cell }: any) => cell.getValue() || '-'
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
        renderEmptyRowsFallback: () => (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Tidak ada data ditemukan</Typography>
            </Box>
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
                    Laporan TCP (Konsolidasi Stok)
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
                        label="Pilih Tanggal Mulai" 
                        value={startDate} 
                        onChange={(newValue) => setStartDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker 
                        label="Pilih Tanggal Selesai" 
                        value={endDate} 
                        onChange={(newValue) => setEndDate(newValue)}
                        slotProps={{ textField: { size: 'small' } }}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={applyCustomDate} sx={{ borderRadius: '20px', textTransform: 'none' }}>Tampilkan</Button>
            </Paper>

            <MaterialReactTable table={table} />
        </Container>
    );
};

export default TcpReport;
