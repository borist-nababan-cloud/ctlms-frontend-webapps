import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
    Box, CssBaseline, AppBar, Toolbar, IconButton, Typography,
    Drawer, Avatar, Container, useTheme, useMediaQuery, Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from '../Sidebar';
import CopyrightIcon from '@mui/icons-material/Copyright';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useColorMode } from '../../context/ThemeContext';

const drawerWidth = 260; // Standard sidebar width

export default function MainLayout() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true); // Default open on desktop

    const { profile } = useAuth();
    const { mode, toggleColorMode } = useColorMode();
    const appName = import.meta.env.VITE_NAVBAR_TITLE || 'CoalLogix System';

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDesktopOpen(!desktopOpen);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <CssBaseline />

            {/* --- HEADER (Quasar: q-header) --- */}
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText'
                }}
                elevation={0}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Logo Placeholder or Icon could go here */}
                        <Typography variant="h6" noWrap component="div">
                            {appName}
                        </Typography>
                    </Box>

                    {/* User Profile Avatar / Settings */}
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
                            <Avatar
                                sx={{ width: 32, height: 32, bgcolor: 'secondary.main', cursor: 'pointer' }}
                            >
                                {profile?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* --- SIDEBAR (Quasar: q-drawer) --- */}

            {/* 1. Mobile Drawer (Temporary Overlay) - Keeps usage of MUI Drawer for overlay behavior */}
            {/* Strictly only render/open if isMobile is true to prevent ghost instances on desktop */}
            <Drawer
                variant="temporary"
                open={isMobile && mobileOpen}
                onClose={handleDrawerToggle}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {isMobile && <Sidebar onClose={() => setMobileOpen(false)} />}
            </Drawer>

            {/* 2. Desktop Sidebar (Fixed Visual) - Replaces Persistent Drawer to avoid double spacing */}
            <Box
                component="div"
                sx={{
                    position: 'fixed',
                    top: 64, // Below Header
                    left: 0,
                    bottom: 40, // Above Footer
                    width: drawerWidth,
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: 'background.paper',
                    zIndex: 100, // Below Header (zIndex ~1100), Above Content
                    display: { xs: 'none', md: desktopOpen ? 'block' : 'none' },
                    overflowY: 'auto'
                }}
            >
                <Sidebar />
            </Box>

            {/* 3. Layout Spacer - Reserves space in the Flex Row for the Fixed Sidebar */}
            <Box
                component="nav"
                sx={{
                    width: { md: desktopOpen ? drawerWidth : 0 },
                    flexShrink: { md: 0 },
                    transition: 'width 0.3s',
                }}
                aria-hidden="true"
            />

            {/* --- MAIN CONTENT (Quasar: q-page-container) --- */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto', // Enable scrolling inside this box
                    pt: '64px', // Header Height
                    pb: '40px', // Footer Height
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? '#f5f5f5' : '#121212',
                    transition: 'margin 0.3s',
                }}
            >
                <Container maxWidth="xl" sx={{ mt: 4, mb: 4, minHeight: 'calc(100vh - 64px - 40px - 64px)' }}>
                    {/* This is where the Pages render */}
                    <Outlet />
                </Container>
            </Box>

            {/* --- FOOTER (Quasar: q-footer) --- */}
            <AppBar
                position="fixed"
                color="default"
                sx={{
                    top: 'auto',
                    bottom: 0,
                    height: '40px',
                    zIndex: (theme) => theme.zIndex.drawer + 2,
                    borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: (theme) => theme.palette.background.paper
                }}
                elevation={0}
            >
                <Toolbar variant="dense" sx={{ minHeight: '40px !important', justifyContent: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={1}>
                        <CopyrightIcon fontSize="small" sx={{ fontSize: '1rem' }} /> {new Date().getFullYear()} {import.meta.env.VITE_COMPANY_NAME || 'Company Name'}. {import.meta.env.VITE_APP_VERSION || '1.0.0'}
                    </Typography>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
