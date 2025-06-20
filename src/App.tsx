import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { usePlanFeatures } from './hooks/usePlanFeatures';
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';
import SubscriptionGuard from './components/SubscriptionGuard';
import SubscriptionBanner from './components/SubscriptionBanner';
import AdminGuard from './components/AdminGuard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import CreateGroupPage from './pages/CreateGroupPage';
import PlayersPage from './pages/PlayersPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import PlayerResenhasPage from './pages/PlayerResenhasPage';
import EditPlayerPage from './pages/EditPlayerPage';
import FinancesPage from './pages/FinancesPage';
import SorteioPage from './pages/SorteioPage';
import ResenhaPage from './pages/ResenhaPage';
import ResenhaFormPage from './pages/ResenhaFormPage';
import ResenhaDetailsPage from './pages/ResenhaDetailsPage';
import ResenhaEditPage from './pages/ResenhaEditPage';
import ProfilePage from './pages/ProfilePage';
import RemindersPage from './pages/RemindersPage';
import RewardsPage from './pages/RewardsPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingScreen from './components/common/LoadingScreen';
import NotificationManager from './components/notifications/NotificationManager';
import PricingPage from './pages/PricingPage';
import SuccessPage from './pages/SuccessPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { limits } = usePlanFeatures();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/cadastro', '/pricing', '/success'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If not logged in and not on a public route, redirect to login
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {user && <NotificationManager />}
      {user && <SubscriptionBanner />}
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/cadastro" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/success" element={<SuccessPage />} />
        </Route>

        {/* Admin route */}
        <Route element={<Layout />}>
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />
        </Route>

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <SubscriptionGuard>
                <DashboardPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/grupos"
            element={
              <SubscriptionGuard>
                <GroupsPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/grupos/novo"
            element={
              <SubscriptionGuard>
                <CreateGroupPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/grupos/:id"
            element={
              <SubscriptionGuard>
                <GroupDetailsPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/jogadores"
            element={
              <SubscriptionGuard>
                <PlayersPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/jogadores/:id"
            element={
              <SubscriptionGuard>
                <PlayerProfilePage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/jogadores/:id/resenhas"
            element={
              <SubscriptionGuard>
                <PlayerResenhasPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/jogadores/:id/editar"
            element={
              <SubscriptionGuard>
                <EditPlayerPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/financeiro"
            element={
              <SubscriptionGuard>
                <FinancesPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/sorteio"
            element={
              <SubscriptionGuard>
                <SorteioPage />
              </SubscriptionGuard>
            }
          />

          {limits.hasResenha && (
            <>
              <Route
                path="/resenha"
                element={
                  <SubscriptionGuard requireSubscription={true}>
                    <ResenhaPage />
                  </SubscriptionGuard>
                }
              />
              <Route
                path="/resenha/nova"
                element={
                  <SubscriptionGuard requireSubscription={true}>
                    <ResenhaFormPage />
                  </SubscriptionGuard>
                }
              />
              <Route
                path="/resenha/:id"
                element={
                  <SubscriptionGuard requireSubscription={true}>
                    <ResenhaDetailsPage />
                  </SubscriptionGuard>
                }
              />
              <Route
                path="/resenha/:id/editar"
                element={
                  <SubscriptionGuard requireSubscription={true}>
                    <ResenhaEditPage />
                  </SubscriptionGuard>
                }
              />
            </>
          )}

          <Route
            path="/perfil"
            element={
              <SubscriptionGuard>
                <ProfilePage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/lembretes"
            element={
              <SubscriptionGuard>
                <RemindersPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/recompensas"
            element={
              <SubscriptionGuard>
                <RewardsPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/sobre"
            element={
              <SubscriptionGuard>
                <AboutPage />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/ajuda"
            element={
              <SubscriptionGuard>
                <HelpPage />
              </SubscriptionGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;