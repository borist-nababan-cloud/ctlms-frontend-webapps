import { useMemo } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Container,
    Paper,
    Box
} from '@mui/material';
import { Brightness4, Brightness7, Logout } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

const Dashboard = () => {
    const { mode, toggleColorMode } = useColorMode();
    const { profile, signOut, user } = useAuth();

    // Column Definitions
    const colDefs = useMemo<ColDef[]>(() => [
        { field: 'id', headerName: 'User UUID', flex: 2 },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { field: 'role_id', headerName: 'Role ID', flex: 1 },
        { field: 'created_at', headerName: 'Created At', flex: 1.5 },
    ], []);

    // Row Data (Just the current user profile for verification)
    const rowData = useMemo(() => {
        if (!profile && user) {
            return [{
                id: user.id,
                email: user.email,
                role_id: 'Loading...',
                created_at: user.created_at
            }]
        }
        return profile ? [profile] : [];
    }, [profile, user]);

    const handleLogout = () => {
        signOut();
    };

    return (
        <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        CoalLogix Dashboard
                    </Typography>

                    <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
                        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>

                    <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h5" gutterBottom>
                    User Profile Verification
                </Typography>

                <Paper sx={{ height: 400, width: '100%', overflow: 'hidden' }}>
                    {/* 
                We need to wrap AgGridReact in a div with the theme class.
                AG Grid v32+ uses CSS variables, but we are using v35 (latest).
                We can just use "ag-theme-material" and override with CSS or rely on basic dark mode support if enabled.
                For simplicity, we'll switch class based on mode.
            */}
                    <div className={mode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ height: '100%', width: '100%' }}>
                        <AgGridReact
                            rowData={rowData}
                            columnDefs={colDefs}
                            theme={mode === 'dark' ? "legacy" : "legacy"} // Basic theme config, classes handle the rest
                        />
                    </div>
                </Paper>
            </Container>
        </Box>
    );
};

export default Dashboard;
