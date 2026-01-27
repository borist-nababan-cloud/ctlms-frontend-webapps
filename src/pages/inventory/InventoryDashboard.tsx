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
import type { InventoryCurrent } from '../../types/supabase';

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
    const [tabValue, setTabValue] = useState(0);

    // Data States
    const [currentStock, setCurrentStock] = useState<InventoryCurrent[]>([]);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [tabValue]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tabValue === 0) {
                const data = await inventoryService.getCurrentStock();
                setCurrentStock(data);
            } else {
                const data = await inventoryService.getStockHistory();
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
        { accessorKey: 'sku_code', header: 'SKU Code', size: 120 },
        { accessorKey: 'product_name', header: 'Product Name', size: 200 },
        {
            accessorKey: 'current_stock_kg',
            header: 'Stock (Kg)',
            size: 150,
            Cell: ({ cell }) => (
                <span style={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {cell.getValue<number>()?.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            accessorKey: 'current_stock_mt', // Virtual accessor, calculate in render
            header: 'Stock (MT)',
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
            header: 'Date',
            size: 180,
            Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString('id-ID'),
        },
        {
            accessorKey: 'transaction_type',
            header: 'Type',
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
        { accessorKey: 'master_products.name', header: 'Product', size: 200 },
        {
            accessorKey: 'qty_change',
            header: 'Qty Change (Kg)',
            size: 150,
            Cell: ({ cell }) => {
                const value = cell.getValue<number>();
                const color = value > 0 ? 'green' : (value < 0 ? 'red' : 'inherit');
                return (
                    <span style={{ color, fontWeight: 'bold' }}>
                        {value > 0 ? `+${value.toLocaleString('id-ID')}` : value.toLocaleString('id-ID')}
                    </span>
                );
            }
        },
        { accessorKey: 'notes', header: 'Notes', size: 250 }
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

    const currentTable = useMaterialReactTable({
        columns: currentColumns,
        data: currentStock,
        ...commonTableOptions
    });

    const historyTable = useMaterialReactTable({
        columns: historyColumns,
        data: historyLogs,
        ...commonTableOptions,
        initialState: { sorting: [{ id: 'created_at', desc: true }] }
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Inventory / Dashboard
                </Typography>
                <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>
                    Refresh
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab label="Current Stock" />
                    <Tab label="Stock History" />
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
