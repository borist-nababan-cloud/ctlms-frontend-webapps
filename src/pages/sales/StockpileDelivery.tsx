import { Container, Typography, Card, CardContent } from '@mui/material';
import { useColorMode } from '../../context/ThemeContext';
import { Warehouse as WarehouseIcon } from '@mui/icons-material';

const StockpileDelivery = () => {
    const { mode } = useColorMode();

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 'bold',
                    mb: 3,
                    background: 'linear-gradient(45deg, #6366F1 30%, #A855F7 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}
            >
                Pengiriman Stock Pile
            </Typography>
            <Card
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    background: mode === 'dark'
                        ? 'rgba(0, 0, 0, 0.4)'
                        : 'rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    p: 4,
                    textAlign: 'center',
                }}
            >
                <CardContent>
                    <WarehouseIcon sx={{ fontSize: 64, color: '#A855F7', mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Modul Pengiriman Stock Pile
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Halaman ini sedang dalam pengembangan untuk mendukung pencatatan pengiriman batubara dari stockpile.
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default StockpileDelivery;
