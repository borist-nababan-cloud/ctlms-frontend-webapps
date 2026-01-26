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
    Category as ProductsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


interface MenuItemInfo {
    label: string;
    path?: string;
    icon: React.ReactNode;
    allowedRoles: number[];
    children?: MenuItemInfo[];
}

const MENU_ITEMS: MenuItemInfo[] = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon />, allowedRoles: [1, 2, 3, 4, 5, 6, 7] },
    {
        label: 'Master Data',
        icon: <MasterDataIcon />,
        allowedRoles: [1, 2, 3, 4, 5, 6],
        children: [
            { label: 'Partners', path: '/master/partners', icon: <PartnersIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
            { label: 'Products', path: '/master/products', icon: <ProductsIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
        ]
    },
    { label: 'Procurement', path: '/procurement', icon: <ProcurementIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { label: 'Inventory', path: '/inventory', icon: <InventoryIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { label: 'Sales', path: '/sales', icon: <SalesIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { label: 'Logistics', path: '/logistics', icon: <LogisticsIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { label: 'Finance', path: '/finance', icon: <FinanceIcon />, allowedRoles: [1, 2, 3, 4, 5, 6] },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon />, allowedRoles: [1, 2, 3, 4, 5, 6, 7] },
];


interface SidebarProps {
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuth();
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const userRole = profile?.user_role ? Number(profile.user_role) : 0;
    const navTitle = import.meta.env.VITE_NAVBAR_TITLE || 'NSM';

    const handleNavigate = (path: string) => {
        navigate(path);
        if (onClose) onClose();
    };

    const handleToggleSubMenu = (label: string) => {
        setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const renderMenuItem = (item: MenuItemInfo) => {
        if (!item.allowedRoles.includes(userRole)) return null;

        if (item.children) {
            const isOpen = openSubMenus[item.label] || false;
            return (
                <React.Fragment key={item.label}>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => handleToggleSubMenu(item.label)}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                            {isOpen ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                    </ListItem>
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {item.children.map(child => {
                                if (!child.allowedRoles.includes(userRole)) return null;
                                const isChildActive = location.pathname === child.path;
                                return (
                                    <ListItem key={child.label} disablePadding>
                                        <ListItemButton
                                            onClick={() => handleNavigate(child.path!)}
                                            selected={isChildActive}
                                            sx={{ pl: 4 }}
                                        >
                                            <ListItemIcon sx={{ color: isChildActive ? 'primary.main' : 'inherit' }}>
                                                {child.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={child.label}
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
            <ListItem key={item.label} disablePadding>
                <ListItemButton onClick={() => handleNavigate(item.path!)} selected={isActive}>
                    <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                        {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} sx={{ color: isActive ? 'primary.main' : 'inherit' }} />
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
