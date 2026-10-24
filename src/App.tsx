import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Shield } from 'lucide-react';
import { ScopeProvider } from './context/ScopeContext';

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

// Guard for authenticated pages with granular permission verification
function ProtectedRoute({
  children,
  resource,
}: {
  children: React.ReactNode;
  resource?: string;
}) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;

  if (resource) {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
        const permissions = user.permissions || {};
        if (permissions && Object.keys(permissions).length > 0) {
          const modPerms = permissions[resource];
          if (Array.isArray(modPerms) && !modPerms.includes('read')) {
            return (
              <Layout>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#f4f6fa] dark:bg-[#1a1a1a] h-full">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Доступ к разделу ограничен</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
                    У вашей роли <strong>«{user.role}»</strong> нет разрешения на просмотр данного модуля. Если вам необходим доступ, обратитесь к руководителю или администратору компании.
                  </p>
                  <button
                    onClick={() => (window.location.href = '/')}
                    className="px-4 py-2 bg-[#0071e3] text-white rounded-xl text-xs font-bold hover:bg-[#0077ed] transition-all shadow-sm"
                  >
                    Вернуться на главную
                  </button>
                </div>
              </Layout>
            );
          }
        }
      }
    } catch (e) {
      console.error('Error verifying route permission', e);
    }
  }

  return <Layout>{children}</Layout>;
}

// Legacy PrivateRoute alias
function PrivateRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
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
      <ScopeProvider>
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
              <ProtectedRoute resource="agents">
                <Agents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute resource="map">
                <RoutesMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photo-reports"
            element={
              <ProtectedRoute resource="photo_reports">
                <PhotoReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute resource="clients">
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog"
            element={
              <ProtectedRoute resource="catalog">
                <Catalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute resource="warehouse">
                <Warehouse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute resource="orders">
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns"
            element={
              <ProtectedRoute resource="returns">
                <Returns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute resource="tasks">
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salary"
            element={
              <ProtectedRoute resource="salary">
                <Salary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute resource="payments">
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/branches"
            element={
              <ProtectedRoute resource="branches">
                <Branches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <ProtectedRoute resource="promotions">
                <Promotions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute resource="roles">
                <Roles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/smm"
            element={
              <ProtectedRoute resource="smm">
                <SmmPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedbacks"
            element={
              <ProtectedRoute resource="feedbacks">
                <FeedbackPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute resource="audit_logs">
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute resource="reports">
                <ReportConstructor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute>
                <SuperAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute resource="ai">
                <AiAssistant />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ScopeProvider>
    </Router>
  );
}
