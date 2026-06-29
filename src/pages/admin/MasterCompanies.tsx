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
    Grid,
    MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Image as ImageIcon } from '@mui/icons-material';
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from 'material-react-table';
import { useForm, Controller } from 'react-hook-form';
import { useColorMode } from '../../context/ThemeContext';
import { masterService } from '../../lib/masterService';
import type { MasterCompany } from '../../types/supabase';
import { containsHtmlOrScript } from '../../lib/sanitizer';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

const MasterCompanies = () => {
    const { mode } = useColorMode();
    const { t } = useTranslation();
    const [companies, setCompanies] = useState<MasterCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog State
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Logo Upload State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // React Hook Form
    const { control, handleSubmit, reset, formState: { errors } } = useForm<Partial<MasterCompany>>({
        defaultValues: {
            name: '',
            address1: '',
            address2: '',
            city: '',
            province: '',
            zipcode: '',
            pic_name: '',
            email: '',
            mobile: '',
            fixline: '',
            logo_url: '',
            type_sj: 1
        }
    });

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await masterService.getCompanies();
            setCompanies(data);
        } catch (err: any) {
            console.error('Error fetching companies:', err);
            setError('Gagal memuat data perusahaan dari sistem.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    // MRT Columns
    const columns = useMemo<MRT_ColumnDef<MasterCompany>[]>(() => [
        {
            accessorKey: 'logo_url',
            header: t('companies.logo'),
            size: 100,
            enableColumnFilter: false,
            enableSorting: false,
            Cell: ({ cell }) => {
                const url = cell.getValue<string>();
                return url ? (
                    <Box
                        component="img"
                        src={url}
                        alt="Logo"
                        sx={{
                            width: 40,
                            height: 40,
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            p: '2px'
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            border: '1px dashed rgba(148, 163, 184, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        <ImageIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </Box>
                );
            }
        },
        {
            accessorKey: 'name',
            header: t('companies.company_name'),
            size: 250,
            enableClickToCopy: true,
        },
        {
            accessorKey: 'city',
            header: t('companies.city'),
            size: 150,
        },
        {
            accessorKey: 'pic_name',
            header: t('companies.pic_name'),
            size: 200,
        },
        {
            accessorKey: 'type_sj',
            header: 'Type Surat Jalan',
            size: 150,
            Cell: ({ cell }) => `Type ${cell.getValue<number>() || 1}`,
        },
    ], [t]);

    // Handlers
    const handleOpen = () => {
        setEditingId(null);
        setLogoFile(null);
        setPreviewUrl(null);
        setLogoError(null);
        reset({
            name: '',
            address1: '',
            address2: '',
            city: '',
            province: '',
            zipcode: '',
            pic_name: '',
            email: '',
            mobile: '',
            fixline: '',
            logo_url: '',
            type_sj: 1
        });
        setOpen(true);
    };

    const handleEdit = (company: MasterCompany) => {
        setEditingId(company.id);
        setLogoFile(null);
        setPreviewUrl(company.logo_url || null);
        setLogoError(null);
        reset(company);
        setOpen(true);
    };

    const handleClose = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setOpen(false);
        setLogoFile(null);
        setPreviewUrl(null);
        setLogoError(null);
        reset({
            name: '',
            address1: '',
            address2: '',
            city: '',
            province: '',
            zipcode: '',
            pic_name: '',
            email: '',
            mobile: '',
            fixline: '',
            logo_url: '',
            type_sj: 1
        });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            setLogoError(t('companies.logo_invalid'));
            return;
        }

        setLogoError(null);
        setLogoFile(file);
        
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoError(null);
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    const onSubmit = async (data: Partial<MasterCompany>) => {
        if (
            containsHtmlOrScript(data.name) || containsHtmlOrScript(data.address1) ||
            containsHtmlOrScript(data.address2) || containsHtmlOrScript(data.city) ||
            containsHtmlOrScript(data.province) || containsHtmlOrScript(data.zipcode) ||
            containsHtmlOrScript(data.pic_name) || containsHtmlOrScript(data.email) ||
            containsHtmlOrScript(data.mobile) || containsHtmlOrScript(data.fixline)
        ) {
            setError('Input mengandung karakter tidak valid atau script berbahaya');
            return;
        }

        try {
            setError(null);
            setUploading(true);
            
            let finalLogoUrl = data.logo_url || null;

            if (logoFile) {
                const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `companies/${Date.now()}_${cleanFileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('company-logos')
                    .upload(filePath, logoFile, {
                        contentType: logoFile.type,
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Detail Error Supabase:", uploadError);
                    throw new Error(`Upload failed: ${uploadError.message}`);
                }

                const { data: publicUrlData } = supabase.storage
                    .from('company-logos')
                    .getPublicUrl(filePath);

                finalLogoUrl = publicUrlData.publicUrl;
            } else if (previewUrl === null) {
                finalLogoUrl = null;
            }

            const updatedData = {
                ...data,
                logo_url: finalLogoUrl
            };

            if (editingId) {
                await masterService.updateCompany(editingId, updatedData);
            } else {
                await masterService.createCompany(updatedData as any);
            }
            setOpen(false);
            fetchCompanies();
        } catch (err: any) {
            console.error('Error saving company:', err);
            setError('Terjadi kesalahan pada sistem saat menyimpan data.');
        } finally {
            setUploading(false);
        }
    };

    const table = useMaterialReactTable({
        columns,
        data: companies,
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            },
        },
    });

    return (
        <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #7C4DFF 30%, #E040FB 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('companies.title')}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                    sx={{
                        borderRadius: '20px',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #7C4DFF 30%, #E040FB 90%)',
                        boxShadow: '0 3px 5px 2px rgba(124, 77, 255, .3)',
                    }}
                >
                    {t('companies.add_new')}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <MaterialReactTable table={table} />

            {/* Dialog Form */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {t('companies.dialog_title')}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            {/* Logo Upload: Grid size={12} */}
                            <Grid size={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', px: 1 }}>
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            position: 'relative',
                                            flexShrink: 0
                                        }}
                                    >
                                        {previewUrl ? (
                                            <Box
                                                component="img"
                                                src={previewUrl}
                                                alt="Preview Logo"
                                                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <ImageIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="outlined"
                                                component="label"
                                                size="small"
                                                disabled={uploading}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {t('companies.select_logo')}
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept="image/png, image/jpeg, image/jpg"
                                                    onChange={handleLogoChange}
                                                />
                                            </Button>
                                            {previewUrl && (
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    disabled={uploading}
                                                    onClick={handleRemoveLogo}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {t('companies.remove_logo')}
                                                </Button>
                                            )}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('companies.logo_helper')}
                                        </Typography>
                                        {logoError && (
                                            <Typography variant="caption" color="error">
                                                {logoError}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Nama Perusahaan: Grid xs={12} */}
                            <Grid size={12}>
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={{ required: t('companies.required_name') }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.company_name')}
                                            fullWidth
                                            error={!!errors.name}
                                            helperText={errors.name?.message}
                                            autoFocus
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Alamat 1 & 2: Grid xs={12} */}
                            <Grid size={12}>
                                <Controller
                                    name="address1"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.address1')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="address2"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.address2')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Kota & Provinsi: Grid xs={6} */}
                            <Grid size={6}>
                                <Controller
                                    name="city"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.city')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={6}>
                                <Controller
                                    name="province"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.province')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Kode Pos: Grid xs={6} */}
                            <Grid size={6}>
                                <Controller
                                    name="zipcode"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.zipcode')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={6}></Grid>

                            {/* Nama PIC: Grid xs={12} */}
                            <Grid size={12}>
                                <Controller
                                    name="pic_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.pic_name')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Email: Grid xs={6} */}
                            <Grid size={6}>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="email"
                                            label={t('companies.email')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* No. HP (Mobile): Grid xs={6} */}
                            <Grid size={6}>
                                <Controller
                                    name="mobile"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.mobile')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* No. Telepon (Fixline): Grid xs={12} */}
                            <Grid size={12}>
                                <Controller
                                    name="fixline"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={t('companies.fixline')}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Type Surat Jalan: Grid size={12} */}
                            <Grid size={12}>
                                <Controller
                                    name="type_sj"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Type Surat Jalan"
                                            fullWidth
                                        >
                                            <MenuItem value={1}>Type 1</MenuItem>
                                            <MenuItem value={2}>Type 2</MenuItem>
                                            <MenuItem value={3}>Type 3</MenuItem>
                                        </TextField>
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose} variant="outlined" disabled={uploading}>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={uploading}
                            sx={{
                                background: 'linear-gradient(45deg, #7C4DFF 30%, #E040FB 90%)',
                                borderRadius: '8px'
                            }}
                        >
                            {uploading ? 'Mengunggah...' : t('common.save')}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
};

export default MasterCompanies;
