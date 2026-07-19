// TODO: Implement Role-Based Access Control here. Only allow specific roles to access.

import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    Tabs,
    Tab
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { reportService, type DateFilter } from '../../lib/reportService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const DeliveryReport = () => {
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
    const [tabValue, setTabValue] = useState(0);

    const fetchData = async () => {
        
        setLoading(true);
        try {
            const isCancelled = tabValue === 1;
            const data = await reportService.getPengiriman(companyId, userRole, dateFilter, isCancelled);
            
            setTableData(data);
        } catch (err) {
            console.error('[DeliveryReport] Error fetching delivery report:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [companyId, userRole, dateFilter, tabValue]);

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
        filename: 'Laporan_Pengiriman'
    });

    const handleExportData = () => {
        const exportData = tableData.map(row => ({
            'Tanggal': row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : '',
            'No. SO': row.order_no || '',
            'No. PO': row.po_number || '',
            'No. SJ': row.sj_number || '',
            'Tipe Pengiriman': row.delivery_type || '',
            'Customer': row.customer_name || '',
            'Produk Publish': row.published_product_name || '',
            'Produk Internal': row.internal_product_name || '',
            'Qty (Kg)': row.produk_net || 0,
            'Blending': row.type_blending || '',
            'Tipe Produksi': row.type_production || '',
            'Transporter': row.transporter_name || '-',
            'No. Polisi': row.truck_plate || '-'
        }));
        const csv = generateCsv(csvConfig)(exportData);
        download(csvConfig)(csv);
    };

    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
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
            accessorKey: 'order_no', 
            header: 'No. SO',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'po_number', 
            header: 'No. PO',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'sj_number', 
            header: 'No. SJ',
            Cell: ({ cell, row }: any) => (
                <Box>
                    <Typography variant="body2" sx={{ textDecoration: row.original.is_cancel ? 'line-through' : 'none' }}>
                        {cell.getValue() || '-'}
                    </Typography>
                    {row.original.is_cancel && (
                        <Typography variant="caption" color="error" fontWeight="bold">
                            Status: Dibatalkan
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            accessorKey: 'delivery_type',
            header: 'Tipe Pengiriman',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'customer_name', 
            header: 'Customer',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'published_product_name', 
            header: 'Produk Publish',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'internal_product_name', 
            header: 'Produk Internal',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'produk_net', 
            header: 'Qty (Kg)', 
            aggregationFn: 'sum',
            AggregatedCell: ({ cell }: any) => (
                <strong style={{ color: '#4caf50' }}>
                    {new Intl.NumberFormat('id-ID').format(cell.getValue() || 0)}
                </strong>
            ),
            Cell: ({ cell }: any) => new Intl.NumberFormat('id-ID').format(cell.getValue() || 0) 
        },
        { 
            accessorKey: 'type_blending', 
            header: 'Blending',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        { 
            accessorKey: 'type_production', 
            header: 'Tipe Produksi',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'transporter_name',
            header: 'Transporter',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'truck_plate',
            header: 'No. Polisi',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        },
        {
            accessorKey: 'created_by_name',
            header: 'Dibuat Oleh',
            Cell: ({ cell }: any) => cell.getValue() || '-'
        }
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: tableData,
        state: { isLoading: loading },
        enableGrouping: true,
        getRowId: (_, index) => String(index),
        muiTableBodyRowProps: ({ row }) => ({
            sx: {
                backgroundColor: row.original.is_cancel 
                    ? (mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)') 
                    : 'inherit',
                opacity: row.original.is_cancel ? 0.7 : 1,
            },
        }),
        initialState: {
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 },
            grouping: ['sj_number'],
            expanded: true
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
                    background: 'linear-gradient(45deg, #3f51b5 30%, #9c27b0 90%)',
                    boxShadow: '0 3px 5px 2px rgba(63, 81, 181, .3)',
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
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #3f51b5 30%, #9c27b0 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Laporan Pengiriman
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

            <Tabs 
                value={tabValue} 
                onChange={(_, newValue) => setTabValue(newValue)} 
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="Semua Dokumen" />
                <Tab label="Dokumen Dibatalkan" />
            </Tabs>

            <MaterialReactTable table={table} />
        </Container>
    );
};

export default DeliveryReport;
