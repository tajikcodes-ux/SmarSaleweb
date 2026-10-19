import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy loaded page components for optimal performance and instant initial load
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agents = lazy(() => import('./pages/Agents'));
const RoutesMap = lazy(() => import('./pages/RoutesMap'));
const Clients = lazy(() => import('./pages/Clients'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Orders = lazy(() => import('./pages/Orders'));
const Returns = lazy(() => import('./pages/Returns'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Salary = lazy(() => import('./pages/Salary'));
const Payments = lazy(() => import('./pages/Payments'));
const Warehouse = lazy(() => import('./pages/Warehouse'));
const AiAssistant = lazy(() => import('./pages/AiAssistant'));
const Branches = lazy(() => import('./pages/Branches'));
const Promotions = lazy(() => import('./pages/Promotions'));
const Roles = lazy(() => import('./pages/Roles'));
const SmmPanel = lazy(() => import('./pages/SmmPanel'));
const FeedbackPanel = lazy(() => import('./pages/FeedbackPanel'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const ReportConstructor = lazy(() => import('./pages/ReportConstructor'));
const PhotoReports = lazy(() => import('./pages/PhotoReports'));
const Landing = lazy(() => import('./pages/Landing'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <div className="text-sm font-medium tracking-wide text-slate-400 animate-pulse">
        Загрузка SmartSale...
      </div>
    </div>
  );
}

// Guard for authenticated pages
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

// Redirect home page based on user role or landing domain
function HomeRedirect() {
  try {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user?.role === 'SUPER_ADMIN') {
      return <Navigate to="/superadmin" replace />;
    }
  } catch (e) {
    console.error('Error parsing user profile', e);
  }
  return <Dashboard />;
}

function RootRoute() {
  const isLandingHost = window.location.hostname.includes('landing') || 
                        window.location.hostname.includes('promo') ||
                        window.location.search.includes('landing=true');
  const token = localStorage.getItem('access_token');
  
  if (isLandingHost && !token) {
    return <Landing />;
  }
  
  return (
    <PrivateRoute>
      <HomeRedirect />
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<Landing />} />
          
          <Route
            path="/"
            element={<RootRoute />}
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
            path="/photo-reports"
            element={
              <PrivateRoute>
                <PhotoReports />
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
            path="/audit-logs"
            element={
              <PrivateRoute>
                <AuditLogs />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportConstructor />
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
      </Suspense>
    </Router>
  );
}
