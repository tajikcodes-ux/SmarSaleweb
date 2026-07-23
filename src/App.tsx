import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import RoutesMap from './pages/RoutesMap';
import Clients from './pages/Clients';
import Catalog from './pages/Catalog';
import Orders from './pages/Orders';
import Returns from './pages/Returns';
import Tasks from './pages/Tasks';
import Salary from './pages/Salary';
import Payments from './pages/Payments';
import Warehouse from './pages/Warehouse';
import AiAssistant from './pages/AiAssistant';
import Branches from './pages/Branches';
import Promotions from './pages/Promotions';
import Roles from './pages/Roles';
import SmmPanel from './pages/SmmPanel';
import FeedbackPanel from './pages/FeedbackPanel';
import SuperAdmin from './pages/SuperAdmin';
import Layout from './components/Layout';

// Guard for authenticated pages
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <PrivateRoute>
              <Agents />
            </PrivateRoute>
          }
        />
        <Route
          path="/map"
          element={
            <PrivateRoute>
              <RoutesMap />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <Clients />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalog"
          element={
            <PrivateRoute>
              <Catalog />
            </PrivateRoute>
          }
        />
        <Route
          path="/warehouse"
          element={
            <PrivateRoute>
              <Warehouse />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <PrivateRoute>
              <Returns />
            </PrivateRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <Tasks />
            </PrivateRoute>
          }
        />
        <Route
          path="/salary"
          element={
            <PrivateRoute>
              <Salary />
            </PrivateRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <Payments />
            </PrivateRoute>
          }
        />
        <Route
          path="/branches"
          element={
            <PrivateRoute>
              <Branches />
            </PrivateRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <PrivateRoute>
              <Promotions />
            </PrivateRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <PrivateRoute>
              <Roles />
            </PrivateRoute>
          }
        />
        <Route
          path="/smm"
          element={
            <PrivateRoute>
              <SmmPanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/feedbacks"
          element={
            <PrivateRoute>
              <FeedbackPanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <PrivateRoute>
              <SuperAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <PrivateRoute>
              <AiAssistant />
            </PrivateRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
