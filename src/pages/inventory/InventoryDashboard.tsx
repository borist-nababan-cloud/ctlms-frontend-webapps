import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Chip,
    Button
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';

import { inventoryService } from '../../lib/inventoryService';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import type { InventoryCurrent } from '../../types/supabase';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`inventory-tabpanel-${index}`}
            aria-labelledby={`inventory-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const InventoryDashboard = () => {
    const { mode } = useColorMode();
    const { profile } = useAuth();
    const companyId = profile?.company_id || '';
    const userRole = profile?.user_role ? Number(profile.user_role) : 0;
    const [tabValue, setTabValue] = useState(0);

    // Data States
    const [currentStock, setCurrentStock] = useState<InventoryCurrent[]>([]);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [tabValue, companyId]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tabValue === 0) {
                const data = await inventoryService.getCurrentStock(companyId, userRole);
                // Filter current_stock_kg <> 0
                const filteredData = data.filter((item: any) => item.current_stock_kg !== 0);
                setCurrentStock(filteredData);
            } else {
                const data = await inventoryService.getStockHistory(companyId, userRole);
                setHistoryLogs(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Columns: Current Stock
    const currentColumns = useMemo<MRT_ColumnDef<InventoryCurrent>[]>(() => [
        { accessorKey: 'sku_code', header: 'Kode SKU', size: 120 },
        { accessorKey: 'product_name', header: 'Nama Produk', size: 200 },
        {
            accessorKey: 'current_stock_kg',
            header: 'Stok (Kg)',
            size: 150,
            Cell: ({ cell }) => (
                <span style={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {cell.getValue<number>()?.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            accessorKey: 'current_stock_mt', // Virtual accessor, calculate in render
            header: 'Stok (MT)',
            size: 150,
            Cell: ({ row }) => {
                const kg = row.original.current_stock_kg || 0;
                return (kg / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    ], []);

    // Columns: History
    const historyColumns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: 'created_at',
            header: 'Tanggal',
            size: 180,
            Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString('id-ID'),
        },
        {
            accessorKey: 'transaction_type',
            header: 'Tipe',
            size: 150,
            Cell: ({ cell }) => {
                const type = cell.getValue<string>();
                let color: 'success' | 'error' | 'warning' | 'default' = 'default';
                if (type === 'TALLY_IN') color = 'success';
                else if (type === 'SALES_OUT') color = 'error';
                else if (type === 'ADJUSTMENT') color = 'warning';

                return <Chip label={type} color={color} size="small" />;
            },
        },
        { 
            accessorKey: 'product_name', 
            header: 'Nama Produk', 
            size: 200,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        },
        {
            accessorKey: 'qty_change',
            header: 'Perubahan Qty (Kg)',
            size: 150,
            Cell: ({ cell }) => {
                const value = cell.getValue<number>() || 0;
                const color = value > 0 ? 'green' : (value < 0 ? 'red' : 'inherit');
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {value > 0 ? `+${value.toLocaleString('id-ID')}` : value.toLocaleString('id-ID')}
                    </span>
                );
            }
        },
        { 
            accessorKey: 'vessel_name', 
            header: 'Nama Vessel', 
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        },
        { 
            accessorKey: 'supplier_name', 
            header: 'Supplier', 
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        },
        { 
            accessorKey: 'customer_name', 
            header: 'Customer', 
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        },
        { 
            accessorKey: 'sj_number', 
            header: 'No. SJ', 
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        },
        { 
            accessorKey: 'notes', 
            header: 'Catatan', 
            size: 250,
            Cell: ({ cell }) => cell.getValue<string>() || '-'
        }
    ], []);

    // Common Table Options
    const commonTableOptions = {
        state: {
            isLoading: loading,
            showProgressBars: loading,
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
    };

    const csvConfigCurrent = mkConfig({ fieldSeparator: ',', decimalSeparator: '.', useKeysAsHeaders: true, filename: 'Stok_Saat_Ini' });
    const csvConfigHistory = mkConfig({ fieldSeparator: ',', decimalSeparator: '.', useKeysAsHeaders: true, filename: 'Riwayat_Stok' });

    const handleExportCurrent = () => {
        const exportData = currentStock.map(row => ({
            'Kode SKU': row.sku_code || '',
            'Nama Produk': row.product_name || '',
            'Stok (Kg)': row.current_stock_kg || 0
        }));
        download(csvConfigCurrent)(generateCsv(csvConfigCurrent)(exportData));
    };

    const handleExportHistory = () => {
        const exportData = historyLogs.map(row => ({
            'Tanggal': row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '',
            'Tipe': row.transaction_type || '',
            'Nama Produk': row.product_name || '-',
            'Perubahan Qty (Kg)': row.qty_change || 0,
            'Nama Vessel': row.vessel_name || '-',
            'Supplier': row.supplier_name || '-',
            'Customer': row.customer_name || '-',
            'No. SJ': row.sj_number || '-',
            'Catatan': row.notes || '-'
        }));
        download(csvConfigHistory)(generateCsv(csvConfigHistory)(exportData));
    };

    const currentTable = useMaterialReactTable({
        columns: currentColumns,
        data: currentStock,
        ...commonTableOptions,
        initialState: { sorting: [{ id: 'sku_code', desc: false }] },
        renderTopToolbarCustomActions: () => (
            <Button color="primary" onClick={handleExportCurrent} startIcon={<FileDownloadIcon />} variant="contained">Ekspor CSV</Button>
        )
    });

    const historyTable = useMaterialReactTable({
        columns: historyColumns,
        data: historyLogs,
        ...commonTableOptions,
        initialState: { sorting: [{ id: 'created_at', desc: true }] },
        renderTopToolbarCustomActions: () => (
            <Button color="primary" onClick={handleExportHistory} startIcon={<FileDownloadIcon />} variant="contained">Ekspor CSV</Button>
        )
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Inventaris / Dasbor
                </Typography>
                <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>
                    Segarkan
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab label="Stok Saat Ini" />
                    <Tab label="Riwayat Stok" />
                </Tabs>
            </Box>

            {/* Tab 1: Current Stock */}
            <CustomTabPanel value={tabValue} index={0}>
                <MaterialReactTable table={currentTable} />
            </CustomTabPanel>

            {/* Tab 2: Stock History */}
            <CustomTabPanel value={tabValue} index={1}>
                <MaterialReactTable table={historyTable} />
            </CustomTabPanel>

        </Container>
    );
};

export default InventoryDashboard;
