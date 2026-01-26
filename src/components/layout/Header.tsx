import React from 'react';
import { AppBar, Toolbar, Typography, Avatar, Box, IconButton, Tooltip } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { DarkMode, LightMode } from '@mui/icons-material';

interface HeaderProps {
    title?: string;
    drawerWidth: number;
    handleDrawerToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ drawerWidth }) => {
    const { profile } = useAuth();
    const { mode, toggleColorMode } = useColorMode();
    const appName = import.meta.env.VITE_NAVBAR_TITLE || 'NSM Dashboard';

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
            }}
        >
            <Toolbar>
                {/* Mobile Menu Icon would be handled by MainLayout passing a toggle function if needed */}
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    {appName}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tooltip title="Toggle Theme">
                        <IconButton color="inherit" onClick={toggleColorMode}>
                            {mode === 'dark' ? <LightMode /> : <DarkMode />}
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {profile?.email}
                        </Typography>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                            {profile?.email?.charAt(0).toUpperCase()}
                        </Avatar>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
