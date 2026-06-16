import React from 'react';
import { AppBar, Toolbar, Typography, Avatar, Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';
import { DarkMode, LightMode } from '@mui/icons-material';

interface HeaderProps {
    title?: string;
    drawerWidth: number;
    handleDrawerToggle: () => void;
}

const getValidColor = (color: string | null | undefined): string | null => {
    if (!color) return null;
    let trimmed = color.trim();
    if (!trimmed.startsWith('#')) {
        trimmed = '#' + trimmed;
    }
    return /^#[0-9A-F]{6}$/i.test(trimmed) || /^#[0-9A-F]{3}$/i.test(trimmed) ? trimmed : null;
};

const Header: React.FC<HeaderProps> = ({ drawerWidth }) => {
    const { profile } = useAuth();
    const { mode, toggleColorMode } = useColorMode();
    const theme = useTheme();

    const userHexColor = getValidColor(profile?.hexColor);
    const headerBgColor = userHexColor || theme.palette.primary.main;
    const headerTextColor = theme.palette.getContrastText(headerBgColor);

    const appName = profile?.companyName || import.meta.env.VITE_APP_NAME || 'CoalLogix System';
    return (
        <AppBar
            position="fixed"
            sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
                backgroundColor: headerBgColor,
                color: headerTextColor,
            }}
        >
            <Toolbar>
                {/* Mobile Menu Icon would be handled by MainLayout passing a toggle function if needed */}
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'inherit' }}>
                    {appName}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tooltip title="Toggle Theme">
                        <IconButton color="inherit" onClick={toggleColorMode}>
                            {mode === 'dark' ? <LightMode /> : <DarkMode />}
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: 'inherit' }}>
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

