import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import Partners from './pages/master/Partners';
import Products from './pages/master/Products';
import MasterCompanies from './pages/admin/MasterCompanies';
import UserManagement from './pages/admin/UserManagement';
import MasterBlending from './pages/admin/MasterBlending';
import MasterTypeProduction from './pages/admin/MasterTypeProduction';
import ShipmentList from './pages/shipments/ShipmentList';
import TallyInput from './pages/logistics/TallyInput';
import Monitoring from './pages/logistics/Monitoring';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import SalesOrderList from './pages/sales/SalesOrderList';
import DirectDelivery from './pages/sales/DirectDelivery';
import StockpileDelivery from './pages/sales/StockpileDelivery';


// AG Grid Styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/master/companies" element={<MasterCompanies />} />
                <Route path="/master/blending" element={<MasterBlending />} />
                <Route path="/master/type-production" element={<MasterTypeProduction />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/master/partners" element={<Partners />} />
                <Route path="/master/products" element={<Products />} />
                <Route path="/shipments" element={<ShipmentList />} />
                <Route path="/logistics/input" element={<TallyInput />} />
                <Route path="/logistics/monitoring" element={<Monitoring />} />
                <Route path="/inventory" element={<InventoryDashboard />} />
                <Route path="/sales/orders" element={<SalesOrderList />} />
                <Route path="/sales/direct-barge" element={<DirectDelivery />} />
                <Route path="/sales/stockpile" element={<StockpileDelivery />} />

                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
