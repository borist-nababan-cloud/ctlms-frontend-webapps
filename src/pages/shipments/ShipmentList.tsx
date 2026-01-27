import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    Chip,
    Dialog,
    DialogContent
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { shipmentService } from '../../lib/shipmentService';
import type { ShipmentDetailed } from '../../types/supabase';
import { useTranslation } from 'react-i18next';
import ShipmentForm from './ShipmentForm';

const ShipmentList = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const [shipments, setShipments] = useState<ShipmentDetailed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);



    const fetchShipments = async () => {
        try {
            setLoading(true);
            const data = await shipmentService.getShipments();
            setShipments(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'planned': return 'default'; // gray
            case 'loading': return 'info';
            case 'sailing': return 'primary'; // blue
            case 'discharging': return 'warning'; // orange
            case 'completed': return 'success'; // green
            default: return 'default';
        }
    };

    const columns = useMemo<MRT_ColumnDef<ShipmentDetailed>[]>(() => [
        {
            accessorKey: 'reference_no',
            header: 'Reference No',
            size: 150,
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
            size: 200,
        },
        {
            accessorKey: 'vessel_name',
            header: 'Vessel',
            size: 200,
        },
        {
            accessorKey: 'sku_code',
            header: 'Product (SKU)',
            size: 120,
        },
        {
            accessorKey: 'draft_survey_qty',
            header: 'Qty (Kg)',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>()),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            size: 130,
            Cell: ({ cell }) => {
                const status = cell.getValue<string>();
                return (
                    <Chip
                        label={status.toUpperCase()}
                        color={getStatusColor(status) as any}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            },
        },
        {
            accessorKey: 'eta',
            header: 'ETA',
            size: 120,
        },
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: shipments,
        state: {
            isLoading: loading,
            showProgressBars: loading,
        },
        enableRowActions: true,
        renderRowActions: ({ row }) => (
            <Button
                color="primary"
                onClick={() => {
                    setSelectedId(row.original.id);
                    setModalOpen(true);
                }}
                startIcon={<EditIcon />}
                size="small"
            >
                {t('common.edit')}
            </Button>
        ),
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
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Shipments / Inbound
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setSelectedId(null);
                        setModalOpen(true);
                    }}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    }}
                >
                    Create Shipment
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <MaterialReactTable table={table} />

            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        background: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                    }
                }}
            >
                <DialogContent sx={{ p: 0 }}>
                    <ShipmentForm
                        shipmentId={selectedId}
                        onSuccess={() => {
                            setModalOpen(false);
                            fetchShipments();
                        }}
                        onClose={() => setModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </Container>
    );
};

export default ShipmentList;
