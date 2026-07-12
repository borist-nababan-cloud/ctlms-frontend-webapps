import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckIcon, Cancel as RejectIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { doCancellationService } from '../../lib/doCancellationService';
import type { DoCancellationRequestDetailed } from '../../types/supabase';
import DoCancellationForm from './DoCancellationForm';

const DoCancellation = () => {
    const {} = useColorMode();
    const { profile } = useAuth();
    const [requests, setRequests] = useState<DoCancellationRequestDetailed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    // Form Modal state
    const [formOpen, setFormOpen] = useState(false);
    
    // Confirm Dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<DoCancellationRequestDetailed | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const isSuperuser = profile?.user_role === 1 || profile?.user_role === 8;

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await doCancellationService.getRequests(isSuperuser ? null : profile?.company_id);
            setRequests(data);
        } catch (err: any) {
            console.error('Error fetching DO cancellation requests:', err);
            setError('Terjadi kesalahan pada sistem saat memuat data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [profile?.company_id, profile?.user_role]);

    const handleActionClick = (req: DoCancellationRequestDetailed, action: 'APPROVED' | 'REJECTED') => {
        setSelectedRequest(req);
        setConfirmAction(action);
        setConfirmOpen(true);
    };

    const confirmExecuteAction = async () => {
        if (!selectedRequest || !confirmAction || !profile?.uuid) return;
        

        
        try {
            setActionLoading(true);
            await doCancellationService.updateRequestStatus(selectedRequest.id, confirmAction, profile.uuid);
            
            if (confirmAction === 'APPROVED') {
                setSuccessMsg('Data berhasil diupdate');
            } else {
                setSuccessMsg('Permintaan berhasil ditolak');
            }
            setConfirmOpen(false);
            fetchRequests(); // refresh data
            
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: any) {
            console.error('Error updating status:', err);
            setError('Terjadi kesalahan pada sistem saat memproses data.');
        } finally {
            setActionLoading(false);
        }
    };

    const columns = useMemo<MRT_ColumnDef<DoCancellationRequestDetailed>[]>(() => [
        {
            accessorKey: 'delivery_order_no',
            header: 'No. Surat Jalan',
            size: 150,
        },
        {
            accessorKey: 'po_number',
            header: 'No. PO',
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'request_type',
            header: 'Jenis Permintaan',
            size: 180,
        },
        {
            id: 'detail_perubahan',
            header: 'Detail Perubahan',
            size: 250,
            Cell: ({ row }) => {
                const req = row.original;
                if (req.request_type === 'Ganti Kendaraan') {
                    return (
                        <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>No. Polisi Baru: <b>{req.truck_plate || '-'}</b></Typography>
                        </Box>
                    );
                }
                if (req.request_type === 'Ganti Sales Order') {
                    return (
                        <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>SO Baru: <b>{req.new_so_number || '-'}</b></Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>PO Baru: <b>{req.new_po_number || '-'}</b></Typography>
                        </Box>
                    );
                }
                return '-';
            },
        },
        {
            accessorKey: 'reason',
            header: 'Alasan',
            size: 200,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'requester_name',
            header: 'Pemohon',
            size: 150,
            Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
            accessorKey: 'created_at',
            header: 'Tanggal Request',
            size: 150,
            Cell: ({ cell }) => {
                const val = cell.getValue<string>();
                return val ? new Date(val).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : '-';
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            size: 130,
            Cell: ({ row }) => {
                const status = row.original.status;
                let color: 'warning' | 'success' | 'error' = 'warning';
                let label = 'Menunggu';
                
                if (status === 'APPROVED') {
                    color = 'success';
                    label = 'Disetujui';
                } else if (status === 'REJECTED') {
                    color = 'error';
                    label = 'Ditolak';
                }

                return (
                    <Chip
                        label={label}
                        color={color}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                );
            },
        },
    ], []);

    const table = useMaterialReactTable({
        columns,
        data: requests,
        state: { isLoading: loading },
        enableRowActions: isSuperuser,
        positionActionsColumn: 'last',
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: 'Aksi',
                size: 120,
            },
        },
        renderRowActions: ({ row }) => {
            if (!isSuperuser) {
                return null; // Only superusers can see actions
            }
            
            const isNotOnRequest = row.original.status !== 'ON_REQUEST';
            
            return (
                <Box sx={{ display: 'flex', gap: '8px' }}>
                    <Tooltip title="Setujui">
                        <span>
                            <IconButton 
                                color="success" 
                                onClick={() => handleActionClick(row.original, 'APPROVED')}
                                disabled={isNotOnRequest}
                            >
                                <CheckIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Tolak">
                        <span>
                            <IconButton 
                                color="error" 
                                onClick={() => handleActionClick(row.original, 'REJECTED')}
                                disabled={isNotOnRequest}
                            >
                                <RejectIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            );
        },
        renderTopToolbarCustomActions: () => (
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setFormOpen(true)}
            >
                Buat Permintaan
            </Button>
        ),
        muiTablePaperProps: {
            elevation: 2,
            sx: { borderRadius: 2, overflow: 'hidden' }
        }
    });

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Permintaan Perubahan DO
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

            <MaterialReactTable table={table} />

            <DoCancellationForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={() => {
                    setFormOpen(false);
                    setSuccessMsg('Permintaan berhasil dibuat!');
                    fetchRequests();
                    setTimeout(() => setSuccessMsg(null), 5000);
                }}
            />

            {/* Confirm Dialog for Approve/Reject */}
            <Dialog open={confirmOpen} onClose={() => !actionLoading && setConfirmOpen(false)}>
                <DialogTitle>
                    Konfirmasi {confirmAction === 'APPROVED' ? 'Persetujuan' : 'Penolakan'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Apakah Anda yakin ingin {confirmAction === 'APPROVED' ? 'menyetujui' : 'menolak'} permintaan perubahan untuk Surat Jalan <strong>{selectedRequest?.delivery_order_no}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={actionLoading}>
                        Batal
                    </Button>
                    <Button 
                        onClick={confirmExecuteAction} 
                        color={confirmAction === 'APPROVED' ? 'success' : 'error'} 
                        variant="contained"
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Memproses...' : (confirmAction === 'APPROVED' ? 'Setujui' : 'Tolak')}
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
};

export default DoCancellation;
