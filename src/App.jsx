import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isFirebaseConfigured } from './firebase/config';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UpdateBanner from './components/UpdateBanner';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateTournament from './pages/admin/CreateTournament';
import ManageTournaments from './pages/admin/ManageTournaments';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  return currentUser ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const SetupNotice = () =>
  isFirebaseConfigured ? null : (
    <div className="bg-[#fff6d6] border-b border-ink text-[13px] px-4 sm:px-8 py-2.5">
      <b>Firebase not connected.</b> Copy <code className="font-mono">.env.example</code> to{' '}
      <code className="font-mono">.env</code>, paste your keys, then restart <code className="font-mono">npm start</code>.
    </div>
  );

function AppRoutes() {
  return (
    <div className="frame">
      <SetupNotice />
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournament/:id" element={<TournamentDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/create" element={<AdminRoute><CreateTournament /></AdminRoute>} />
          <Route path="/admin/manage" element={<AdminRoute><ManageTournaments /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#121212',
              color: '#fff',
              borderRadius: 0,
              fontSize: '14px',
              padding: '10px 14px',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
