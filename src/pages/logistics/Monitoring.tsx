import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Chip,
    Alert
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useTranslation } from 'react-i18next';

import { logisticsService } from '../../lib/logisticsService';
import { useColorMode } from '../../context/ThemeContext';

const Monitoring = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await logisticsService.getLogs();
            setLogs(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: 'created_at',
            header: 'Date/Time',
            size: 180,
            Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString('id-ID'),
        },
        {
            accessorKey: 'shipments.vessel_name',
            header: 'Vessel',
            size: 200,
        },
        {
            accessorKey: 'truck_plate',
            header: 'Truck Plate',
            size: 120,
        },
        {
            accessorKey: 'ticket_number',
            header: 'Ticket No',
            size: 120,
        },
        {
            accessorKey: 'net_weight',
            header: 'Net (Kg)',
            size: 120,
            Cell: ({ cell }) => (
                <span style={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {cell.getValue<number>()?.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            accessorKey: 'photo_url',
            header: 'Photo',
            size: 100,
            Cell: ({ cell }) => {
                const url = cell.getValue<string>();
                if (!url) return <Chip label="No Photo" size="small" variant="outlined" />;
                return (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => window.open(url, '_blank')}
                    >
                        View
                    </Button>
                );
            },
        },
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: logs,
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
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {t('sidebar.monitoring')}
                </Typography>
                <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>
                    Refresh
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <MaterialReactTable table={table} />
        </Container>
    );
};

export default Monitoring;
