import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@stayos/auth';
import { SocketProvider, ToastStack, ForgotPasswordPage, ResetPasswordPage } from '@stayos/ui';
import AppShell from './components/AppShell';

// Pages — implemented in Phase 5
const LoginPage        = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage    = React.lazy(() => import('./pages/DashboardPage'));
const TenantsPage      = React.lazy(() => import('./pages/TenantsPage'));
const AgenciesPage     = React.lazy(() => import('./pages/AgenciesPage'));
const AnalyticsPage    = React.lazy(() => import('./pages/AnalyticsPage'));
const RevenuePage      = React.lazy(() => import('./pages/RevenuePage'));
const SubscriptionsPage = React.lazy(() => import('./pages/SubscriptionsPage'));
const UsersPage        = React.lazy(() => import('./pages/UsersPage'));
const PlansPage        = React.lazy(() => import('./pages/PlansPage'));
const CouponsPage      = React.lazy(() => import('./pages/CouponsPage'));
const ReferralsPage    = React.lazy(() => import('./pages/ReferralsPage'));
const VettingPage      = React.lazy(() => import('./pages/VettingPage'));
const SupportPage      = React.lazy(() => import('./pages/SupportPage'));
const ModerationPage   = React.lazy(() => import('./pages/ModerationPage'));
const AuditLogsPage    = React.lazy(() => import('./pages/AuditLogsPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RequireAuth(): React.ReactElement {
  const session = useSession();
  const location = useLocation();
  if (!session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}

function ResetPasswordRoute(): React.ReactElement {
  const { token } = useParams<{ token: string }>();
  return <ResetPasswordPage token={token ?? ''} loginPath="/login" />;
}

function PortalLayout(): React.ReactElement {
  const serverUrl = (import.meta.env as Record<string, string>)['VITE_SOCKET_URL'] ?? '';
  return (
    <SocketProvider serverUrl={serverUrl}>
      <AppShell />
    </SocketProvider>
  );
}

function AppRoutes(): React.ReactElement {
  return (
    <React.Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage userType="platform" loginPath="/login" />} />
        <Route path="/reset-password/:token" element={<ResetPasswordRoute />} />
        <Route element={<RequireAuth />}>
          <Route element={<PortalLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/tenants/:id" element={<TenantsPage />} />

            <Route path="/agencies" element={<AgenciesPage />} />
            <Route path="/agencies/:id" element={<AgenciesPage />} />

            <Route path="/analytics" element={<AnalyticsPage />} />

            <Route path="/revenue" element={<RevenuePage />} />

            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/subscriptions/:id" element={<SubscriptionsPage />} />

            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/new" element={<UsersPage />} />
            <Route path="/users/:id" element={<UsersPage />} />

            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/new" element={<PlansPage />} />
            <Route path="/plans/:id" element={<PlansPage />} />

            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/coupons/new" element={<CouponsPage />} />
            <Route path="/coupons/:id" element={<CouponsPage />} />

            <Route path="/referrals" element={<ReferralsPage />} />

            <Route path="/vetting" element={<VettingPage />} />
            <Route path="/vetting/applications" element={<VettingPage />} />
            <Route path="/vetting/applications/:id" element={<VettingPage />} />

            <Route path="/support/tickets" element={<SupportPage />} />
            <Route path="/support/tickets/:id" element={<SupportPage />} />

            <Route path="/moderation/reviews" element={<ModerationPage />} />

            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Routes>
    </React.Suspense>
  );
}

// Same approach as apps/customer and apps/property's root layout: a client-side
// router.replace/navigate, never a hard window.location.href reload. A full
// reload remounts the whole app, which reruns SessionProvider's bootstrap
// refresh — if that refresh ever fails again (e.g. a slow/cold backend,
// or a request that didn't carry the cookie for any reason), it calls
// onUnauthenticated again, causing another reload, forever. A soft navigate
// just swaps the route; nothing remounts, so there's nothing to loop.
function AppWithAuth(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <SessionProvider
      portalUserType="platform"
      onUnauthenticated={(redirect) => {
        navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login', {
          replace: true,
        });
      }}
    >
      <ToastStack>
        <AppRoutes />
      </ToastStack>
    </SessionProvider>
  );
}

export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithAuth />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
