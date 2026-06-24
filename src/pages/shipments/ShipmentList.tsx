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
import { shipmentService } from '../../lib/shipmentService';
import type { ShipmentDetailed } from '../../types/supabase';
import { useTranslation } from 'react-i18next';
import ShipmentForm from './ShipmentForm';
import { userService } from '../../lib/userService';
import { useAuth } from '../../context/AuthContext';

const ShipmentList = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [shipments, setShipments] = useState<ShipmentDetailed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<'active' | 'completed'>('active');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [users, setUsers] = useState<Record<string, { name: string; email: string }>>({});

    const fetchUsers = async () => {
        try {
            const userData = await userService.getUsers();
            const userMap: Record<string, { name: string; email: string }> = {};
            userData.forEach(u => {
                userMap[u.uuid] = {
                    name: u.real_name || '',
                    email: u.email || ''
                };
            });
            setUsers(userMap);
        } catch (err) {
            console.error('Error fetching users for mapping:', err);
        }
    };

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const data = await shipmentService.getShipments();
            const filteredData = profile?.company_id
                ? data.filter(s => s.company_id === profile.company_id)
                : data;
            setShipments(filteredData);
        } catch (err: any) {
            console.error('Error fetching shipments:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
        fetchUsers();
    }, [profile?.company_id]);

    const columns = useMemo<MRT_ColumnDef<ShipmentDetailed>[]>(() => [
        {
            accessorKey: 'invoice_no',
            header: 'No. Invoice',
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
            accessorKey: 'asal_batu',
            header: 'Asal Batu',
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'sku_code',
            header: 'Produk (SKU)',
            size: 120,
        },
        {
            accessorKey: 'jenis_batu',
            header: 'Jenis Batu',
            size: 120,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'quantity',
            header: 'Kuantitas',
            size: 120,
            Cell: ({ cell }) => new Intl.NumberFormat('id-ID').format(cell.getValue<number>() || 0),
        },
        {
            accessorKey: 'total_bayar',
            header: 'Total Bayar',
            size: 150,
            Cell: ({ row }) => {
                const qty = Number(row.original.quantity) || 0;
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
                        label={isCompleted ? 'Selesai' : 'Aktif'}
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
        {
            accessorKey: 'created_by',
            header: 'Dibuat Oleh',
            size: 150,
            Cell: ({ cell }) => {
                const uuid = cell.getValue<string>();
                if (!uuid) return '-';
                const userInfo = users[uuid];
                if (userInfo) {
                    return userInfo.name || userInfo.email || uuid;
                }
                return uuid;
            }
        },
        {
            accessorKey: 'created_at',
            header: 'Dibuat Pada',
            size: 180,
            Cell: ({ cell }) => {
                const dateStr = cell.getValue<string>();
                if (!dateStr) return '-';
                try {
                    return new Date(dateStr).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch {
                    return dateStr;
                }
            }
        }
    ], [users]);

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
                    Pembelian / Inbound
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
                    Tambah Pembelian
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
                        onSuccess={(msg) => {
                            setModalOpen(false);
                            fetchShipments();
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

export default ShipmentList;
