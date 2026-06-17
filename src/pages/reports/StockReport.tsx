import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Grid,
    Chip,
    Button
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { reportService, type DateFilter } from '../../lib/reportService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const StockReport = () => {
    const { profile } = useAuth();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;

    const [chartData, setChartData] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>({});
    const [activeChip, setActiveChip] = useState<string>('All');

    // Date Picker States
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const fetchData = async () => {
        
        setLoading(true);
        try {
            const [cData, tData] = await Promise.all([
                reportService.getStockMovement(companyId, userRole, dateFilter),
                reportService.getCurrentStock(companyId, userRole)
            ]);
            
            
            setChartData(cData);
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

    const handleExportData = () => {
        const exportData = tableData.map((row) => ({
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
        data: tableData,
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
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Pergerakan Stok (Kumulatif)</Typography>
                        <Box sx={{ width: '100%', height: 350, minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => new Intl.NumberFormat('id-ID').format(value) + ' Kg'} />
                                <Line type="monotone" dataKey="stock" stroke="#8884d8" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <MaterialReactTable table={table} />
                </Grid>
            </Grid>
        </Container>
    );
};

export default StockReport;
