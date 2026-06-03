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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { userService, type UserProfileDetailed } from '../../lib/userService';
import { masterService } from '../../lib/masterService';
import type { UserRole, MasterCompany, MasterWarehouse, UserProfile } from '../../types/supabase';

const UserManagement = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const { profile: loggedInProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Data lists
    const [users, setUsers] = useState<UserProfileDetailed[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [companies, setCompanies] = useState<MasterCompany[]>([]);
    const [warehouses, setWarehouses] = useState<MasterWarehouse[]>([]);

    // Loading & error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Edit modal state
    const [open, setOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfileDetailed | null>(null);

    // Form settings
    const { control, handleSubmit, watch, setValue, reset } = useForm<Partial<UserProfile>>({
        defaultValues: {
            user_role: null,
            company_id: null,
            wh_id: null
        }
    });

    const watchedCompanyId = watch('company_id');

    // Access control
    useEffect(() => {
        if (!authLoading) {
            if (!loggedInProfile || loggedInProfile.user_role !== 8) {
                navigate('/');
            }
        }
    }, [loggedInProfile, authLoading, navigate]);

    // Fetch initial data
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [usersData, rolesData, companiesData, warehousesData] = await Promise.all([
                userService.getUsers(),
                userService.getRoles(),
                masterService.getCompanies(),
                userService.getWarehouses()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
            setCompanies(companiesData);
            setWarehouses(warehousesData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loggedInProfile && loggedInProfile.user_role === 8) {
            fetchData();
        }
    }, [loggedInProfile]);

    // Handle warehouse change based on company change
    useEffect(() => {
        const currentWhId = watch('wh_id');
        // Reset warehouse if selected company doesn't contain currently chosen warehouse
        if (watchedCompanyId) {
            if (currentWhId) {
                const wh = warehouses.find(w => w.id === currentWhId);
                if (wh && wh.company_id !== watchedCompanyId) {
                    setValue('wh_id', null);
                }
            }
        } else {
            if (currentWhId !== null && currentWhId !== undefined) {
                setValue('wh_id', null);
            }
        }
    }, [watchedCompanyId, warehouses, setValue, watch]);

    // Filter warehouses for the dropdown selection
    const filteredWarehouses = useMemo(() => {
        if (!watchedCompanyId) return [];
        return warehouses.filter(w => w.company_id === watchedCompanyId);
    }, [watchedCompanyId, warehouses]);

    // Handlers
    const handleEdit = (user: UserProfileDetailed) => {
        setSelectedUser(user);
        reset({
            user_role: user.user_role,
            company_id: user.company_id,
            wh_id: user.wh_id
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedUser(null);
        reset({
            user_role: null,
            company_id: null,
            wh_id: null
        });
    };

    const onSubmit = async (data: Partial<UserProfile>) => {
        if (!selectedUser) return;
        try {
            setSaving(true);
            setError(null);
            
            // Map form values carefully
            const updatePayload: Partial<UserProfile> = {
                user_role: data.user_role || null,
                company_id: data.company_id || null,
                wh_id: data.wh_id || null
            };

            await userService.updateUserProfile(selectedUser.uuid, updatePayload);
            setOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Columns config
    const colDefs = useMemo<ColDef<UserProfileDetailed>[]>(() => [
        {
            field: 'real_name',
            headerName: t('users.real_name'),
            flex: 1.5,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            field: 'email',
            headerName: t('users.email'),
            flex: 1.5,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            valueGetter: (params) => params.data?.user_roles?.role_name || '-',
            headerName: t('users.role'),
            flex: 1.2,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            valueGetter: (params) => params.data?.master_companies?.name || '-',
            headerName: t('users.company'),
            flex: 1.5,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            valueGetter: (params) => params.data?.master_warehouse?.warehouse_name || '-',
            headerName: t('users.warehouse'),
            flex: 1.5,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            headerName: t('users.action'),
            cellRenderer: (params: any) => {
                return (
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(params.data)}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '20px',
                            py: 0.25
                        }}
                    >
                        {t('common.edit')}
                    </Button>
                );
            },
            width: 120,
            sortable: false,
            filter: false
        }
    ], [t]);

    if (authLoading || (loggedInProfile && loggedInProfile.user_role !== 8)) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #7C4DFF 30%, #E040FB 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('users.title')}
                </Typography>
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
                <div className={mode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ height: '550px', width: '100%' }}>
                    <AgGridReact
                        rowData={users}
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

            {/* Edit Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {t('users.edit_title')} {selectedUser ? ` - ${selectedUser.real_name || selectedUser.email}` : ''}
                    </DialogTitle>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                        
                        {/* Peran */}
                        <FormControl fullWidth>
                            <InputLabel id="role-select-label">{t('users.select_role')}</InputLabel>
                            <Controller
                                name="user_role"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        labelId="role-select-label"
                                        label={t('users.select_role')}
                                        {...field}
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(Number(e.target.value) || null)}
                                    >
                                        <MenuItem value="">
                                            <em>None</em>
                                        </MenuItem>
                                        {roles.map((role) => (
                                            <MenuItem key={role.id} value={role.id}>
                                                {role.role_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                )}
                            />
                        </FormControl>

                        {/* Perusahaan */}
                        <FormControl fullWidth>
                            <InputLabel id="company-select-label">{t('users.select_company')}</InputLabel>
                            <Controller
                                name="company_id"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        labelId="company-select-label"
                                        label={t('users.select_company')}
                                        {...field}
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value || null)}
                                    >
                                        <MenuItem value="">
                                            <em>None</em>
                                        </MenuItem>
                                        {companies.map((company) => (
                                            <MenuItem key={company.id} value={company.id}>
                                                {company.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                )}
                            />
                        </FormControl>

                        {/* Gudang */}
                        <FormControl fullWidth disabled={!watchedCompanyId}>
                            <InputLabel id="warehouse-select-label">{t('users.select_warehouse')}</InputLabel>
                            <Controller
                                name="wh_id"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        labelId="warehouse-select-label"
                                        label={t('users.select_warehouse')}
                                        {...field}
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value || null)}
                                    >
                                        <MenuItem value="">
                                            <em>None</em>
                                        </MenuItem>
                                        {filteredWarehouses.map((wh) => (
                                            <MenuItem key={wh.id} value={wh.id}>
                                                {wh.warehouse_name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                )}
                            />
                        </FormControl>

                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} variant="outlined" disabled={saving}>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                                background: 'linear-gradient(45deg, #7C4DFF 30%, #E040FB 90%)',
                                borderRadius: '8px'
                            }}
                        >
                            {saving ? 'Saving...' : t('common.save')}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
};

export default UserManagement;
