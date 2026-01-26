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
    const [partners, setPartners] = useState<MasterPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            header: 'Name',
            size: 200,
            enableClickToCopy: true,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            size: 120,
            filterVariant: 'select',
            filterSelectOptions: ['SUPPLIER', 'CUSTOMER', 'TRANSPORTER', 'OTHER'],
        },
        {
            accessorKey: 'contact_person',
            header: 'Contact Person',
            size: 150,
        },
        {
            accessorKey: 'phone',
            header: 'Phone',
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
                    {cell.getValue<boolean>() ? 'ACTIVE' : 'INACTIVE'}
                </Box>
            ),
        },
    ], []);

    // Handlers
    const handleOpen = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setTabValue(0);
        setOpen(true);
    };

    const handleEdit = (partner: MasterPartner) => {
        setEditingId(partner.id);
        setFormData(partner);
        setTabValue(0);
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name) {
                alert("Name is required");
                return;
            }

            if (editingId) {
                await masterService.updatePartner(editingId, formData);
            } else {
                await masterService.createPartner(formData as any);
            }
            setOpen(false);
            fetchPartners();
        } catch (err: any) {
            alert('Error saving: ' + err.message);
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
                Edit
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
                    Partners
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
                    Add Partner
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Material React Table */}
            <MaterialReactTable table={table} />

            {/* Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle>{editingId ? 'Edit Partner' : 'New Partner'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label="partner tabs">
                                <Tab label="General Info" />
                                <Tab label="Contact Details" />
                                <Tab label="Contact Person (CP)" />
                                <Tab label="Bank Info" />
                            </Tabs>
                        </Box>

                        {/* Tab 1: General Info */}
                        <CustomTabPanel value={tabValue} index={0}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Name"
                                    fullWidth
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <TextField
                                    select
                                    label="Type"
                                    fullWidth
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <MenuItem value="SUPPLIER">SUPPLIER</MenuItem>
                                    <MenuItem value="CUSTOMER">CUSTOMER</MenuItem>
                                    <MenuItem value="TRANSPORTER">TRANSPORTER</MenuItem>
                                    <MenuItem value="OTHER">OTHER</MenuItem>
                                </TextField>
                                <TextField
                                    label="Tax ID (NPWP)"
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
                                    label={formData.is_active !== false ? "Active" : "Inactive"}
                                />
                            </Box>
                        </CustomTabPanel>

                        {/* Tab 2: Contact Details */}
                        <CustomTabPanel value={tabValue} index={1}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Address"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        label="City"
                                        fullWidth
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    />
                                    <TextField
                                        label="Province"
                                        fullWidth
                                        value={formData.province || ''}
                                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    />
                                </Box>
                                <TextField
                                    label="Office Phone"
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
                                    label="Contact Person Name"
                                    fullWidth
                                    value={formData.contact_person || ''}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                />
                                <TextField
                                    label="Mobile/Phone (CP)"
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
                                    label="Bank Name"
                                    fullWidth
                                    value={formData.bank_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, bank_acc: e.target.value })}
                                />
                                <TextField
                                    label="Account Number"
                                    fullWidth
                                    value={formData.no_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, no_acc: e.target.value })}
                                />
                                <TextField
                                    label="Account Holder Name"
                                    fullWidth
                                    value={formData.name_acc || ''}
                                    onChange={(e) => setFormData({ ...formData, name_acc: e.target.value })}
                                />
                            </Box>
                        </CustomTabPanel>

                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Partners;
