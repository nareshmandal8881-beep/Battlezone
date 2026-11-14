import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isFirebaseConfigured } from './firebase/config';
import { isApp, initNative } from './lib/native';
import { useAppLayout } from './lib/layout';
import { isAdminUser } from './lib/admin';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UpdateBanner from './components/UpdateBanner';
import AppShell from './components/AppShell';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import Ludo from './pages/Ludo';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateTournament from './pages/admin/CreateTournament';
import ManageTournaments from './pages/admin/ManageTournaments';
import ManageGames from './pages/admin/ManageGames';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  return currentUser ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/admin/login" replace />;
  if (!isAdminUser(currentUser, userProfile)) return <Navigate to="/" replace />;
  return children;
};

// In the Android app every screen except login/signup needs an account.
const AppGate = ({ children }) => (isApp ? <ProtectedRoute>{children}</ProtectedRoute> : children);

const SetupNotice = () =>
  isFirebaseConfigured ? null : (
    <div className="bg-[#fff6d6] border-b border-ink text-[13px] px-4 sm:px-8 py-2.5">
      <b>Firebase not connected.</b> Check the keys in <code className="font-mono">src/firebase/config.js</code>.
    </div>
  );

const routes = (
  <Routes>
    <Route path="/" element={<AppGate><Home /></AppGate>} />
    <Route path="/tournaments" element={<AppGate><Tournaments /></AppGate>} />
    <Route path="/tournament/:id" element={<AppGate><TournamentDetail /></AppGate>} />
    <Route path="/leaderboard" element={<AppGate><Leaderboard /></AppGate>} />
    <Route path="/ludo" element={<Ludo />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/admin/login" element={<Login admin />} />
    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    <Route path="/admin/games" element={<AdminRoute><ManageGames /></AdminRoute>} />
    <Route path="/admin/create" element={<AdminRoute><CreateTournament /></AdminRoute>} />
    <Route path="/admin/manage" element={<AdminRoute><ManageTournaments /></AdminRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function AppRoutes() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => initNative(navigate), [navigate]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const mobile = useAppLayout();
  const page = <div key={pathname} className="page-anim">{routes}</div>;

  if (mobile) {
    return (
      <>
        <AppShell>{page}</AppShell>
        <UpdateBanner />
      </>
    );
  }

  return (
    <div className="frame">
      <SetupNotice />
      <Navbar />
      <main className="flex-grow">{page}</main>
      <Footer />
      <UpdateBanner />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#121212', color: '#fff', borderRadius: 0, fontSize: '14px', padding: '10px 14px' },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
