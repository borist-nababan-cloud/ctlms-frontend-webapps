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
    AlertTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const { authError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Clear any stale sessions on mount, unless we just got kicked out due to role 7
    useEffect(() => {
        if (authError !== 'UNASSIGNED_ROLE') {
            console.log('Login: Clearing stale session...');
            supabase.auth.signOut();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Login: signIn error', error);
                setError(error.message);
                setLoading(false);
            } else {
                setLoading(false);
                navigate('/');
            }
        } catch (err) {
            console.error('Login: Unexpected exception', err);
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
                            <AlertTitle>Access Denied</AlertTitle>
                            You are Un-assigned, contact your Administrator
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
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            fullWidth
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
