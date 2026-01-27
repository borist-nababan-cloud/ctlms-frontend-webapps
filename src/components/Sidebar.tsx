import React, { useState } from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Divider,
    Box,
    Typography
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Storage as MasterDataIcon,
    ShoppingCart as ProcurementIcon,
    Inventory as InventoryIcon,
    LocalShipping as LogisticsIcon,
    AttachMoney as FinanceIcon,
    Settings as SettingsIcon,
    PointOfSale as SalesIcon,
    ExpandLess,
    ExpandMore,
    People as PartnersIcon,
    Category as ProductsIcon,
    ExitToApp as LogoutIcon,
    Input as InputIcon,
    Monitor as MonitorIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


import { useTranslation } from 'react-i18next';

interface MenuItemInfo {
    key: string; // Changed from label to key for translation
    path?: string;
    icon: React.ReactNode;
    allowedRoles: number[];
    children?: MenuItemInfo[];
}

const MENU_ITEMS: MenuItemInfo[] = [
    { key: 'sidebar.dashboard', path: '/', icon: <DashboardIcon />, allowedRoles: [1, 2, 3, 4, 5, 6, 7] },
    {
        key: 'sidebar.master_data',
        icon: <MasterDataIcon />,
        allowedRoles: [1, 2, 3, 4, 5, 6],
        children: [
            { key: 'sidebar.partners', path: '/master/partners', icon: <PartnersIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
            { key: 'sidebar.products', path: '/master/products', icon: <ProductsIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
        ]
    },
    { key: 'sidebar.procurement', path: '/shipments', icon: <ProcurementIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { key: 'sidebar.inventory', path: '/inventory', icon: <InventoryIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { key: 'sidebar.sales', path: '/sales', icon: <SalesIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    {
        key: 'sidebar.logistics',
        icon: <LogisticsIcon />,
        allowedRoles: [1, 2, 3, 4, 5, 6],
        children: [
            { key: 'sidebar.tally_input', path: '/logistics/input', icon: <InputIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
            { key: 'sidebar.monitoring', path: '/logistics/monitoring', icon: <MonitorIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
        ]
    },
    { key: 'sidebar.finance', path: '/finance', icon: <FinanceIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { key: 'sidebar.settings', path: '/settings', icon: <SettingsIcon />, allowedRoles: [1, 2, 3, 4, 5, 6, 7] },
];


interface SidebarProps {
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, signOut } = useAuth();
    const { t } = useTranslation();
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const userRole = profile?.user_role ? Number(profile.user_role) : 0;
    const navTitle = import.meta.env.VITE_NAVBAR_TITLE || 'NSM';

    const handleNavigate = (path: string) => {
        navigate(path);
        if (onClose) onClose();
    };

    const handleToggleSubMenu = (key: string) => {
        setOpenSubMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderMenuItem = (item: MenuItemInfo) => {
        if (!item.allowedRoles.includes(userRole)) return null;

        if (item.children) {
            const isOpen = openSubMenus[item.key] || false;
            return (
                <React.Fragment key={item.key}>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => handleToggleSubMenu(item.key)}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={t(item.key)} />
                            {isOpen ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                    </ListItem>
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {item.children.map(child => {
                                if (!child.allowedRoles.includes(userRole)) return null;
                                const isChildActive = location.pathname === child.path;
                                return (
                                    <ListItem key={child.key} disablePadding>
                                        <ListItemButton
                                            onClick={() => handleNavigate(child.path!)}
                                            selected={isChildActive}
                                            sx={{ pl: 4 }}
                                        >
                                            <ListItemIcon sx={{ color: isChildActive ? 'primary.main' : 'inherit' }}>
                                                {child.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={t(child.key)}
                                                sx={{ color: isChildActive ? 'primary.main' : 'inherit' }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Collapse>
                </React.Fragment>
            );
        }

        const isActive = location.pathname === item.path;
        return (
            <ListItem key={item.key} disablePadding>
                <ListItemButton onClick={() => handleNavigate(item.path!)} selected={isActive}>
                    <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                        {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={t(item.key)} sx={{ color: isActive ? 'primary.main' : 'inherit' }} />
                </ListItemButton>
            </ListItem>
        );
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                    {navTitle}
                </Typography>
            </Box>
            <Divider />
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {MENU_ITEMS.map((item) => renderMenuItem(item))}
            </List>
            <Divider />
            <List disablePadding>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => signOut()}>
                        <ListItemIcon>
                            <LogoutIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={t('sidebar.logout')} sx={{ color: 'error.main', fontWeight: 'bold' }} />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    {profile?.email} <br />
                    Role: {userRole}
                </Typography>
            </Box>
        </Box>
    );
};

export default Sidebar;
