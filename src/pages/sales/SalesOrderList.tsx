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
    Tab,
    Snackbar
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { salesService } from '../../lib/salesService';
import type { SalesOrderDetailed } from '../../types/supabase';
import { useTranslation } from 'react-i18next';
import SalesOrderForm from './SalesOrderForm';

const SalesOrderList = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const [orders, setOrders] = useState<SalesOrderDetailed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await salesService.getSalesOrders();
            setOrders(data);
        } catch (err: any) {
            console.error('Error fetching sales orders:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const columns = useMemo<MRT_ColumnDef<SalesOrderDetailed>[]>(() => [
        {
            accessorKey: 'order_no',
            header: 'No. Penjualan',
            size: 150,
        },
        {
            accessorKey: 'company_name',
            header: 'Perusahaan',
            size: 180,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            size: 180,
        },
        {
            accessorKey: 'product_name',
            header: 'Nama Produk',
            size: 180,
        },
        {
            accessorKey: 'qty_ordered',
            header: 'Qty Pesan',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            size: 130,
            Cell: ({ row }) => {
                const isCompleted = row.original.is_completed;
                return (
                    <Chip
                        label={isCompleted ? 'Selesai' : 'Aktif'}
                        color={isCompleted ? 'success' : 'info'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            },
        }
    ], []);

    const filteredOrders = useMemo(() => {
        return orders.filter(so => {
            if (currentTab === 'active') {
                return !so.is_completed;
            } else {
                return !!so.is_completed;
            }
        });
    }, [orders, currentTab]);

    const table = useMaterialReactTable({
        columns,
        data: filteredOrders,
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
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Penjualan / Outbound
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
                        background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                    }}
                >
                    Tambah Penjualan
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
                    <SalesOrderForm
                        salesOrderId={selectedId}
                        onSuccess={(msg) => {
                            setModalOpen(false);
                            fetchOrders();
                            if (msg) setSuccessMsg(msg);
                        }}
                        onClose={() => setModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Snackbar
                open={!!successMsg}
                autoHideDuration={3000}
                onClose={() => setSuccessMsg(null)}
                message={successMsg}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
};

export default SalesOrderList;
