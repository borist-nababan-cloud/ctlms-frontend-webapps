import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Stack
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

import { useForm, Controller } from 'react-hook-form';
import { useColorMode } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { masterService } from '../../lib/masterService';
import { containsHtmlOrScript } from '../../lib/sanitizer';
import type { MasterBlending } from '../../types/supabase';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

interface BlendingFormValues {
    nama_blending: string;
    cost: number;
}

export default function MasterBlendingPage() {
    const { mode } = useColorMode();
    const { t } = useTranslation();

    // Data lists
    const [data, setData] = useState<MasterBlending[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [open, setOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MasterBlending | null>(null);

    // Delete confirmation state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MasterBlending | null>(null);

    // Form settings
    const { control, handleSubmit, reset, formState: { errors } } = useForm<BlendingFormValues>({
        defaultValues: {
            nama_blending: '',
            cost: 0
        }
    });

    // Fetch data from database
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await masterService.getBlendingConfigurations();
            setData(res);
        } catch (err: any) {
            console.error('Error fetching blending data:', err);
            setError('Gagal memuat data dari server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleOpenCreate = () => {
        setSelectedItem(null);
        reset({
            nama_blending: '',
            cost: 0
        });
        setOpen(true);
    };

    const handleOpenEdit = (item: MasterBlending) => {
        setSelectedItem(item);
        reset({
            nama_blending: item.nama_blending,
            cost: Number(item.cost) || 0
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedItem(null);
    };

    const onSubmit = async (formValues: BlendingFormValues) => {
        if (containsHtmlOrScript(formValues.nama_blending)) {
            setError('Input mengandung karakter tidak valid atau script berbahaya');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const payload = {
                nama_blending: formValues.nama_blending,
                cost: Number(formValues.cost) || 0
            };

            if (selectedItem) {
                // Update
                await masterService.updateBlendingConfiguration(selectedItem.id, payload);
            } else {
                // Create
                await masterService.createBlendingConfiguration(payload);
            }

            setOpen(false);
            fetchData();
        } catch (err: any) {
            console.error('Error saving blending configurations:', err);
            setError('Gagal menyimpan data ke server.');
        } finally {
            setSaving(false);
        }
    };

    // Delete confirmation
    const handleOpenDelete = (item: MasterBlending) => {
        setItemToDelete(item);
        setDeleteOpen(true);
    };

    const handleCloseDelete = () => {
        setDeleteOpen(false);
        setItemToDelete(null);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            setSaving(true);
            setError(null);
            await masterService.deleteBlendingConfiguration(itemToDelete.id);
            setDeleteOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (err: any) {
            console.error('Error deleting configuration:', err);
            setError('Gagal menghapus data dari server.');
        } finally {
            setSaving(false);
        }
    };

    // AG-Grid columns configuration
    const colDefs = useMemo<ColDef<MasterBlending>[]>(() => [
        {
            field: 'nama_blending',
            headerName: t('blending.name'),
            flex: 2,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            field: 'cost',
            headerName: t('blending.cost'),
            flex: 1.5,
            valueFormatter: (params) => params.value !== undefined ? formatCurrency(Number(params.value)) : '-',
            filter: 'agNumberColumnFilter',
            sortable: true
        },
        {
            headerName: t('users.action'),
            cellRenderer: (params: any) => {
                return (
                    <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenEdit(params.data)}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '20px',
                                py: 0.25
                            }}
                        >
                            {t('common.edit')}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleOpenDelete(params.data)}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '20px',
                                py: 0.25
                            }}
                        >
                            {t('common.delete')}
                        </Button>
                    </Stack>
                );
            },
            width: 220,
            sortable: false,
            filter: false
        }
    ], [t]);

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('blending.title')}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    sx={{
                        background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                        borderRadius: '20px',
                        textTransform: 'none',
                        boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                        px: 3
                    }}
                >
                    {t('common.add_new')}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box
                sx={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    background: mode === 'dark'
                        ? 'rgba(0, 0, 0, 0.4)'
                        : 'rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    overflow: 'hidden',
                    p: 2,
                    '& .ag-root-wrapper': {
                        border: 'none',
                        background: 'transparent',
                    },
                    '& .ag-header': {
                        background: mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.6) !important'
                            : 'rgba(240, 247, 255, 0.8) !important',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                    },
                    '& .ag-header-cell-text': {
                        color: mode === 'dark' ? '#fff' : '#1e293b',
                        fontWeight: 'bold',
                    },
                    '& .ag-row': {
                        background: 'transparent',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        '&:hover': {
                            background: mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.05) !important'
                                    : 'rgba(0, 0, 0, 0.02) !important',
                        }
                    },
                    '& .ag-cell': {
                        display: 'flex',
                        alignItems: 'center',
                        color: mode === 'dark' ? '#cbd5e1' : '#334155',
                    }
                }}
            >
                <div className={mode === 'dark' ? 'ag-theme-material-dark' : 'ag-theme-material'} style={{ height: '550px', width: '100%' }}>
                    <AgGridReact
                        rowData={data}
                        columnDefs={colDefs}
                        pagination={true}
                        paginationPageSize={10}
                        paginationPageSizeSelector={[10, 20, 50]}
                        domLayout="normal"
                        loading={loading}
                        theme="legacy"
                    />
                </div>
            </Box>

            {/* Create/Edit Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {selectedItem ? t('blending.edit_title') : t('blending.add_new')}
                    </DialogTitle>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                        
                        {/* Nama Blending */}
                        <Controller
                            name="nama_blending"
                            control={control}
                            rules={{ required: t('blending.required_name') }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={t('blending.name')}
                                    placeholder={t('blending.name_placeholder')}
                                    fullWidth
                                    error={!!errors.nama_blending}
                                    helperText={errors.nama_blending?.message}
                                    required
                                />
                            )}
                        />

                        {/* Biaya */}
                        <Controller
                            name="cost"
                            control={control}
                            rules={{ required: t('blending.required_cost') }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="number"
                                    label={t('blending.cost')}
                                    placeholder={t('blending.cost_placeholder')}
                                    fullWidth
                                    error={!!errors.cost}
                                    helperText={errors.cost?.message}
                                    required
                                    slotProps={{
                                        htmlInput: { min: 0, step: "any" }
                                    }}
                                />
                            )}
                        />

                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} variant="outlined" disabled={saving}>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                                background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                                borderRadius: '8px'
                            }}
                        >
                            {saving ? t('common.loading') : t('common.save')}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onClose={handleCloseDelete} PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>{t('common.delete')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        Apakah Anda yakin ingin menghapus blending configuration <strong>{itemToDelete?.nama_blending}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDelete} variant="outlined" disabled={saving}>{t('common.cancel')}</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained" disabled={saving} sx={{ borderRadius: '8px' }}>
                        {saving ? t('common.loading') : t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
