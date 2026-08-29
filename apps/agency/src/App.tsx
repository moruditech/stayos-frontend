import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession, useSessionLoading } from '@stayos/auth';
import { SocketProvider, ToastStack, ForgotPasswordPage, ResetPasswordPage } from '@stayos/ui';
import AppShell from './components/AppShell';

// Pages — implemented in Phase 5
const LoginPage       = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage   = React.lazy(() => import('./pages/DashboardPage'));
const ProfilePage     = React.lazy(() => import('./pages/ProfilePage'));
const PortfolioPage   = React.lazy(() => import('./pages/PortfolioPage'));
const MandatesPage    = React.lazy(() => import('./pages/MandatesPage'));
const PropertiesPage  = React.lazy(() => import('./pages/PropertiesPage'));
const StaffPage       = React.lazy(() => import('./pages/StaffPage'));
const StatementsPage  = React.lazy(() => import('./pages/StatementsPage'));
const BillingPage     = React.lazy(() => import('./pages/BillingPage'));
const AnalyticsPage   = React.lazy(() => import('./pages/AnalyticsPage'));
const OnboardingPage  = React.lazy(() => import('./pages/OnboardingPage'));
const SupportPage     = React.lazy(() => import('./pages/SupportPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// ── Auth guard ────────────────────────────────────────────────────────────────
// Vite apps have no pre-paint middleware step — the loader checks the
// in-memory session directly. See Document 02 §8.2 / Document 00 §4.
function RequireAuth(): React.ReactElement {
  const session = useSession();
  const isLoading = useSessionLoading();
  const location = useLocation();

  if (isLoading) return <></>;

  if (!session) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }
  return <Outlet />;
}

function ResetPasswordRoute(): React.ReactElement {
  const { token } = useParams<{ token: string }>();
  return <ResetPasswordPage token={token ?? ''} loginPath="/login" />;
}

// ── Portal layout (mounted inside RequireAuth) ────────────────────────────────
function PortalLayout(): React.ReactElement {
  const serverUrl = import.meta.env['VITE_SOCKET_URL'] as string ?? '';

  return (
    <SocketProvider serverUrl={serverUrl}>
      <AppShell />
    </SocketProvider>
  );
}

// ── Route table ───────────────────────────────────────────────────────────────
function AppRoutes(): React.ReactElement {
  return (
    <React.Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage userType="agency" loginPath="/login" />} />
        <Route path="/reset-password/:token" element={<ResetPasswordRoute />} />
        <Route element={<RequireAuth />}>
          <Route element={<PortalLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/mandates" element={<MandatesPage />} />
            <Route path="/mandates/new" element={<MandatesPage />} />
            <Route path="/mandates/:id" element={<MandatesPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/onboard" element={<PropertiesPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/staff/new" element={<StaffPage />} />
            <Route path="/staff/:id" element={<StaffPage />} />
            <Route path="/staff/:id/properties" element={<StaffPage />} />
            <Route path="/statements" element={<StatementsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/invoices" element={<BillingPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analytics/compare" element={<AnalyticsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support/new" element={<SupportPage />} />
            <Route path="/support/:id" element={<SupportPage />} />
          </Route>
        </Route>
      </Routes>
    </React.Suspense>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider
          portalUserType="agency"
          onUnauthenticated={(redirect) => {
            if (window.location.pathname === '/login') return;
            window.location.href = `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
          }}
        >
          <ToastStack>
            <AppRoutes />
          </ToastStack>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
