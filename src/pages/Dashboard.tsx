import {
    Container,
    Card,
    CardContent,
    Typography,
    Box
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { profile } = useAuth();
    const appName = import.meta.env.VITE_APP_NAME || 'Application';

    return (
        <Container maxWidth="xl" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 4 }}>
            <Box>
                <Card elevation={3}>
                    <CardContent sx={{ textAlign: 'center', py: 5 }}>
                        <Typography variant="h3" component="h1" gutterBottom color="primary">
                            Selamat Datang di {appName}
                        </Typography>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Halo, {profile?.real_name || profile?.email}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 2 }}>
                            Pilih menu dari bilah samping untuk memulai.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default Dashboard;
