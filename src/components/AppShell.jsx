import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAward, FiBarChart2, FiSettings, FiChevronLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/tournaments', label: 'Matches', icon: FiAward },
  { to: '/leaderboard', label: 'Ranks', icon: FiBarChart2 },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

const TITLES = {
  '/': null,
  '/tournaments': 'Matches',
  '/leaderboard': 'Leaderboard',
  '/settings': 'Settings',
  '/profile': 'My profile',
  '/admin': 'Admin',
  '/admin/create': 'New tournament',
  '/admin/manage': 'Manage',
};

// Phone-app layout: slim top bar + bottom tab bar. Used only inside the Android app.
const AppShell = ({ children }) => {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isAuthScreen = pathname === '/login' || pathname === '/register';
  if (isAuthScreen || !currentUser) return <div className="min-h-screen bg-white safe-top safe-bottom">{children}</div>;

  const isTab = TABS.some((t) => t.to === pathname);
  const title = TITLES[pathname] ?? (pathname.startsWith('/tournament/') ? 'Match' : '');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-ink safe-top">
        <div className="h-14 px-3 flex items-center gap-2">
          {isTab ? (
            <img src="/logo192.png" alt="" className="w-9 h-9 object-cover border border-ink" />
          ) : (
            <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-1 grid place-items-center text-[22px] press" aria-label="Back">
              <FiChevronLeft />
            </button>
          )}
          <h1 className="text-[24px] truncate">{title || 'BattleZone'}</h1>
        </div>
      </header>

      <main className="flex-1 pb-[76px]">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink safe-bottom">
        <div className="grid grid-cols-4 h-[60px]">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} replace
              className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold press ${
                isActive ? 'text-ink' : 'text-[#9a968e]'
              }`}>
              {({ isActive }) => (
                <>
                  <span className={`tab-pill w-12 h-7 grid place-items-center text-[19px] ${isActive ? 'bg-ink text-white on' : ''}`}><Icon /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
