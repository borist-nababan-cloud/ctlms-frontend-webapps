import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Box,
    AlertTitle,
    IconButton,
    InputAdornment,
    CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { containsHtmlOrScript } from '../lib/sanitizer';

const Login = () => {
    const { t } = useTranslation();
    const { authError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Clear any stale sessions on mount, unless we just got kicked out due to role 7
    useEffect(() => {
        if (authError !== 'UNASSIGNED_ROLE') {
            supabase.auth.signOut();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setError('Surel dan kata sandi wajib diisi');
            setLoading(false);
            return;
        }

        if (containsHtmlOrScript(trimmedEmail) || containsHtmlOrScript(trimmedPassword)) {
            setError('Input mengandung karakter tidak valid atau script berbahaya');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword,
            });

            if (error) {
                console.error('Login: signIn error', error);
                setError('Surel atau kata sandi salah, atau terjadi kesalahan pada sistem.');
                setLoading(false);
            } else {
                setLoading(false);
                navigate('/');
            }
        } catch (err) {
            console.error('Login: Unexpected exception', err);
            setError('Terjadi kesalahan pada sistem');
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Card sx={{ width: '100%', padding: 2, mb: 2 }}>
                <CardContent>
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        {import.meta.env.VITE_APP_NAME}
                    </Typography>

                    {authError === 'UNASSIGNED_ROLE' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <AlertTitle>Akses Ditolak</AlertTitle>
                            Anda tidak ditugaskan, hubungi Administrator
                        </Alert>
                    )}

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label={t('auth.email')}
                            type="email"
                            variant="outlined"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <TextField
                            label={t('auth.password')}
                            type={showPassword ? 'text' : 'password'}
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            fullWidth
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? t('common.loading') : t('auth.sign_in')}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Box component="footer" sx={{ textAlign: 'center', color: 'text.secondary', typography: 'body2' }}>
                {import.meta.env.VITE_COMPANY_NAME} - {import.meta.env.VITE_APP_VERSION}
            </Box>
        </Container>
    );
};


export default Login;
