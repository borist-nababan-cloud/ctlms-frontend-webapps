import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Container,
    Typography,
    Switch,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Avatar,
    Button,
    TextField,
    Alert,
    Snackbar,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { DarkMode, LightMode, Person } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';

const Settings = () => {
    const { mode, toggleColorMode } = useColorMode();
    const { profile } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!newPassword || !confirmPassword) {
            setErrorMsg('Semua kolom password wajib diisi');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMsg('Password minimal harus memiliki 6 karakter');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg('Password tidak cocok');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                console.error('Error changing password:', error);
                setErrorMsg('Gagal mengubah password. Silakan coba lagi.');
            } else {
                setNewPassword('');
                setConfirmPassword('');
                setSuccessOpen(true);
            }
        } catch (err: any) {
            console.error('Unexpected error changing password:', err);
            setErrorMsg('Terjadi kesalahan pada sistem saat mengubah password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
                Pengaturan
            </Typography>

            {/* Appearance Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Tampilan
                    </Typography>
                    <List>
                        <ListItem>
                            <Box sx={{ mr: 2 }}>
                                {mode === 'dark' ? <DarkMode /> : <LightMode />}
                            </Box>
                            <ListItemText
                                primary="Mode Gelap"
                                secondary="Peralihan antara tema terang dan gelap"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    edge="end"
                                    checked={mode === 'dark'}
                                    onChange={toggleColorMode}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </CardContent>
            </Card>

            {/* Account Info Section */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Informasi Akun
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2 }}>
                        <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}>
                            {profile?.email?.charAt(0).toUpperCase() || <Person />}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">
                                {profile?.real_name || 'User'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {profile?.email}
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <List dense>
                        <ListItem>
                            <ListItemText
                                primary="ID Pengguna"
                                secondary={profile?.uuid}
                                secondaryTypographyProps={{ sx: { fontFamily: 'monospace' } }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="ID Peran"
                                secondary={profile?.user_role?.toString() || 'Tidak ada'}
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>

            {/* Ganti Password Section */}
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Ganti Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Perbarui password akun Anda untuk menjaga keamanan akun.
                    </Typography>

                    {errorMsg && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorMsg}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handlePasswordChange} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '400px' }}>
                        <TextField
                            label="Password Baru"
                            type={showPassword ? 'text' : 'password'}
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={submitting}
                        />
                        <TextField
                            label="Konfirmasi Password Baru"
                            type={showPassword ? 'text' : 'password'}
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={submitting}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Tampilkan Password"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{ alignSelf: 'flex-start', mt: 1, textTransform: 'none', borderRadius: '8px' }}
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Password'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Snackbar
                open={successOpen}
                autoHideDuration={4000}
                onClose={() => setSuccessOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
                    Password berhasil diubah
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Settings;
