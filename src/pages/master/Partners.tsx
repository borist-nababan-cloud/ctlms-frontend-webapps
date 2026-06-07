import React, { useState, useEffect, useMemo } from 'react';
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
    MenuItem,
    Alert,
    Tabs,
    Tab,
    Switch,
    FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useColorMode } from '../../context/ThemeContext';
import { masterService } from '../../lib/masterService';
import type { MasterPartner } from '../../types/supabase';
import { useTranslation } from 'react-i18next';

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
            id={`partner-tabpanel-${index}`}
            aria-labelledby={`partner-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 2 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const Partners = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const [partners, setPartners] = useState<MasterPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);

    // Dialog State
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);

    const initialFormState: Partial<MasterPartner> = {
        name: '',
        type: 'SUPPLIER',
        tax_id: '',
        address: '',
        city: '',
        province: '',
        email: '',
        phone: '',
        contact_person: '',
        phone_cp: '',
        wa_cp: '',
        bank_acc: '',
        no_acc: '',
        name_acc: '',
        is_active: true
    };

    const [formData, setFormData] = useState<Partial<MasterPartner>>(initialFormState);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const data = await masterService.getPartners();
            setPartners(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    // MRT Columns
    const columns = useMemo<MRT_ColumnDef<MasterPartner>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Nama Mitra',
            size: 200,
            enableClickToCopy: true,
        },
        {
            accessorKey: 'type',
            header: 'Tipe',
            size: 120,
            filterVariant: 'select',
            filterSelectOptions: ['SUPPLIER', 'CUSTOMER', 'TRANSPORTER', 'OTHER'],
            Cell: ({ cell }) => {
                const val = cell.getValue<string>();
                if (val === 'SUPPLIER') return 'Supplier';
                if (val === 'CUSTOMER') return 'Customer';
                if (val === 'TRANSPORTER') return 'Transporter';
                return 'Lainnya';
            }
        },
        {
            accessorKey: 'contact_person',
            header: 'Kontak Person (CP)',
            size: 150,
        },
        {
            accessorKey: 'phone',
            header: 'Telepon',
            size: 150,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            size: 200,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            size: 100,
            filterVariant: 'checkbox',
            Cell: ({ cell }) => (
                <Box
                    component="span"
                    sx={(theme) => ({
                        backgroundColor: cell.getValue<boolean>()
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                        borderRadius: '0.25rem',
                        color: '#fff',
                        maxWidth: '9ch',
                        p: '0.25rem',
                    })}
                >
                    {cell.getValue<boolean>() ? 'AKTIF' : 'TIDAK AKTIF'}
                </Box>
            ),
        },
    ], []);

    // Handlers
    const handleOpen = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setTabValue(0);
        setDialogError(null);
        setOpen(true);
    };

    const handleEdit = (partner: MasterPartner) => {
        setEditingId(partner.id);
        setFormData(partner);
        setTabValue(0);
        setDialogError(null);
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleSubmit = async () => {
        setDialogError(null);

        const trimmedName = formData.name?.trim() || '';
        const trimmedTaxId = formData.tax_id?.trim() || '';
        const trimmedAddress = formData.address?.trim() || '';
        const trimmedCity = formData.city?.trim() || '';
        const trimmedProvince = formData.province?.trim() || '';
        const trimmedEmail = formData.email?.trim() || '';
        const trimmedPhone = formData.phone?.trim() || '';
        const trimmedContactPerson = formData.contact_person?.trim() || '';
        const trimmedPhoneCp = formData.phone_cp?.trim() || '';
        const trimmedWaCp = formData.wa_cp?.trim() || '';
        const trimmedBankAcc = formData.bank_acc?.trim() || '';
        const trimmedNoAcc = formData.no_acc?.trim() || '';
        const trimmedNameAcc = formData.name_acc?.trim() || '';

        if (!trimmedName) {
            setDialogError("Nama Mitra wajib diisi.");
            return;
        }

        const payload: Partial<MasterPartner> = {
            ...formData,
            name: trimmedName,
            tax_id: trimmedTaxId,
            address: trimmedAddress,
            city: trimmedCity,
            province: trimmedProvince,
            email: trimmedEmail,
            phone: trimmedPhone,
            contact_person: trimmedContactPerson,
            phone_cp: trimmedPhoneCp,
            wa_cp: trimmedWaCp,
            bank_acc: trimmedBankAcc,
            no_acc: trimmedNoAcc,
            name_acc: trimmedNameAcc,
        };

        try {
            if (editingId) {
                await masterService.updatePartner(editingId, payload);
            } else {
                await masterService.createPartner(payload as any);
            }
            setOpen(false);
            fetchPartners();
        } catch (err: any) {
            console.error('Error saving partner:', err);
            setDialogError('Terjadi kesalahan pada sistem saat menyimpan data.');
        }
    };

    const table = useMaterialReactTable({
        columns,
        data: partners,
        state: {
            isLoading: loading,
            showProgressBars: loading,
        },
        enableRowSelection: true,
        enableColumnFilterModes: true,
        enableColumnOrdering: true,
        enableGrouping: true,
        enablePinning: true,
        enableRowActions: true,
        initialState: {
            showColumnFilters: true,
            density: 'compact',
            pagination: { pageSize: 10, pageIndex: 0 }
        },
        paginationDisplayMode: 'pages',
        positionToolbarAlertBanner: 'bottom',
        muiSearchTextFieldProps: {
            size: 'small',
            variant: 'outlined',
        },
        muiPaginationProps: {
            color: 'primary',
            rowsPerPageOptions: [10, 20, 50],
            shape: 'rounded',
            variant: 'outlined',
        },
        renderRowActions: ({ row }) => (
            <Button
                color="primary"
                onClick={() => handleEdit(row.original)}
                startIcon={<EditIcon />}
                size="small"
            >
                {t('common.edit')}
            </Button>
        ),
        // Futuristic Glass Theme Props
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
                overflow: 'hidden', // rounded corners
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1,
                },
            },
        }),
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.6)'
                    : 'rgba(240, 247, 255, 0.8)', // Pastel Blueish
                backdropFilter: 'blur(4px)',
                color: mode === 'dark' ? '#fff' : '#1e293b',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            },
        },
    });

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Master Mitra
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    }}
                >
                    Tambah Mitra Baru
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Material React Table */}
            <MaterialReactTable table={table} />

            {/* Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle>{editingId ? 'Edit Mitra' : 'Tambah Mitra Baru'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ width: '100%' }}>
                        {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label="partner tabs">
                                <Tab label="Informasi Umum" />
                                <Tab label="Detail Kontak" />
                                <Tab label="Kontak Person (CP)" />
                                <Tab label="Informasi Bank" />
                            </Tabs>
                        </Box>

                        {/* Tab 1: General Info */}
                        <CustomTabPanel value={tabValue} index={0}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Nama Mitra"
                                    fullWidth
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <TextField
                                    select
                                    label="Tipe"
                                    fullWidth
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <MenuItem value="SUPPLIER">Supplier</MenuItem>
                                    <MenuItem value="CUSTOMER">Customer</MenuItem>
                                    <MenuItem value="TRANSPORTER">Transporter</MenuItem>
                                    <MenuItem value="OTHER">Lainnya</MenuItem>
                                </TextField>
                                <TextField
                                    label="NPWP (ID Pajak)"
                                    fullWidth
                                    value={formData.tax_id || ''}
                                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.is_active !== false} // Default true
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                    }
                                    label={formData.is_active !== false ? "Aktif" : "Tidak Aktif"}
                                />
                            </Box>
                        </CustomTabPanel>

                        {/* Tab 2: Contact Details */}
                        <CustomTabPanel value={tabValue} index={1}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Alamat"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        label="Kota"
                                        fullWidth
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    />
                                    <TextField
                                        label="Provinsi"
                                        fullWidth
                                        value={formData.province || ''}
                                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    />
                                </Box>
                                <TextField
                                    label="Telepon Kantor"
                                    fullWidth
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <TextField
                                    label="Email"
                                    type="email"
                                    fullWidth
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </Box>
                        </CustomTabPanel>

                        {/* Tab 3: CP */}
                        <CustomTabPanel value={tabValue} index={2}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Nama Kontak Person"
                                    fullWidth
                                    value={formData.contact_person || ''}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                />
                                <TextField
                                    label="No. HP (CP)"
                                    fullWidth
                                    value={formData.phone_cp || ''}
                                    onChange={(e) => setFormData({ ...formData, phone_cp: e.target.value })}
                                />
                                <TextField
                                    label="WhatsApp (CP)"
                                    fullWidth
                                    value={formData.wa_cp || ''}
                                    onChange={(e) => setFormData({ ...formData, wa_cp: e.target.value })}
                                />
                            </Box>
                        </CustomTabPanel>

                        {/* Tab 4: Bank Info */}
                        <CustomTabPanel value={tabValue} index={3}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Nama Bank"
                                    fullWidth
                                    value={formData.bank_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, bank_acc: e.target.value })}
                                />
                                <TextField
                                    label="No. Rekening"
                                    fullWidth
                                    value={formData.no_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, no_acc: e.target.value })}
                                />
                                <TextField
                                    label="Nama Pemilik Rekening"
                                    fullWidth
                                    value={formData.name_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, name_acc: e.target.value })}
                                />
                            </Box>
                        </CustomTabPanel>

                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Batal</Button>
                    <Button onClick={handleSubmit} variant="contained">Simpan</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Partners;
