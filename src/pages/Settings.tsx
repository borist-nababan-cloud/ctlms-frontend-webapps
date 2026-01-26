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
    Avatar
} from '@mui/material';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { DarkMode, LightMode, Person } from '@mui/icons-material';

const Settings = () => {
    const { mode, toggleColorMode } = useColorMode();
    const { profile } = useAuth();

    return (
        <Container maxWidth="md">
            <Typography variant="h4" sx={{ mb: 4 }}>
                Settings
            </Typography>

            {/* Appearance Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Appearance
                    </Typography>
                    <List>
                        <ListItem>
                            <Box sx={{ mr: 2 }}>
                                {mode === 'dark' ? <DarkMode /> : <LightMode />}
                            </Box>
                            <ListItemText
                                primary="Dark Mode"
                                secondary="Switch between light and dark themes"
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
                        Account Information
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
                                primary="User ID"
                                secondary={profile?.uuid}
                                secondaryTypographyProps={{ sx: { fontFamily: 'monospace' } }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Role ID"
                                secondary={profile?.user_role?.toString() || 'N/A'}
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Settings;
