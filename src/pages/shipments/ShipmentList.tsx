import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    Chip,
    Dialog,
    DialogContent,
    Tabs,
    Tab
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
    const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');



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

    const columns = useMemo<MRT_ColumnDef<ShipmentDetailed>[]>(() => [
        {
            accessorKey: 'reference_no',
            header: 'No Referensi',
            size: 150,
        },
        {
            accessorKey: 'company_name',
            header: 'Perusahaan',
            size: 180,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
            size: 180,
        },
        {
            accessorKey: 'vessel_name',
            header: 'Vessel',
            size: 150,
        },
        {
            accessorKey: 'sku_code',
            header: 'Produk (SKU)',
            size: 120,
        },
        {
            accessorKey: 'draft_survey_qty',
            header: 'Qty (Kg)',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            accessorKey: 'total_bayar',
            header: 'Total Bayar',
            size: 150,
            Cell: ({ row }) => {
                const qty = Number(row.original.draft_survey_qty) || 0;
                const price = Number(row.original.harga) || 0;
                const ppn = Number(row.original.ppn_tax) || 0;
                const pph = Number(row.original.pph_tax) || 0;
                const disc = Number(row.original.disc) || 0;
                const total = (qty * price) + ppn + pph - disc;
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total);
            },
        },
        {
            accessorKey: 'is_completed',
            header: 'Status',
            size: 130,
            Cell: ({ cell }) => {
                const isCompleted = cell.getValue<boolean>();
                return (
                    <Chip
                        label={isCompleted ? 'SELESAI' : 'AKTIF'}
                        color={isCompleted ? 'success' : 'info'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            },
        },
        {
            accessorKey: 'issue_date',
            header: 'Tanggal Invoice',
            size: 130,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'eta',
            header: 'ETA',
            size: 120,
        },
    ], []);

    const filteredShipments = useMemo(() => {
        return shipments.filter(s => {
            if (currentTab === 'active') {
                return !s.is_completed;
            } else {
                return !!s.is_completed;
            }
        });
    }, [shipments, currentTab]);

    const table = useMaterialReactTable({
        columns,
        data: filteredShipments,
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

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={currentTab}
                    onChange={(_, newValue) => setCurrentTab(newValue)}
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab label="Aktif" value="active" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab label="Selesai" value="completed" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                </Tabs>
            </Box>

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
