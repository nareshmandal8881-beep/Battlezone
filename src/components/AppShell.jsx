import React, { useEffect } from 'react';
import { isApp } from '../lib/native';
import { showBanner, hideBanner, NO_BANNER } from '../lib/ads';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAward, FiBarChart2, FiSettings, FiChevronLeft, FiUser, FiBell } from 'react-icons/fi';
import { useNotifications } from '../lib/notify';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

const TITLES = {
  '/': null,
  '/tournaments': 'Matches',
  '/leaderboard': 'Leaderboard',
  '/settings': 'Settings',
  '/profile': 'My profile',
  '/ludo': 'Ludo',
  '/admin': 'Admin',
  '/admin/create': 'New tournament',
  '/admin/manage': 'Manage',
  '/admin/games': 'Games',
  '/admin/notify': 'Notify',
  '/notifications': 'Notifications',
};

const ROOT = ['/', '/tournaments', '/leaderboard', '/settings', '/ludo'];

const Tab = ({ to, label, icon: Icon, end }) => (
  <NavLink to={to} end={end} replace
    className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider press ${
      isActive ? 'text-[#f5b301]' : 'text-[#8a867d]'
    }`}>
    {({ isActive }) => (
      <>
        <Icon className={`text-[21px] tab-pill ${isActive ? 'on drop-shadow-[0_0_8px_rgba(245,179,1,.7)]' : ''}`} />
        {label}
        <span className={`h-[2px] w-5 -mt-0.5 transition-all ${isActive ? 'bg-[#f5b301]' : 'bg-transparent'}`} />
      </>
    )}
  </NavLink>
);

// Phone layout: slim top bar + gaming bottom bar with a raised PLAY button.
const AppShell = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useNotifications();
  const bannerHere = isApp && !NO_BANNER.includes(pathname) && !pathname.startsWith('/admin');
  useEffect(() => { if (bannerHere) showBanner(); else hideBanner(); }, [bannerHere]);

  if (pathname === '/login' || pathname === '/register') {
    return <div className="min-h-screen bg-white safe-top safe-bottom">{children}</div>;
  }

  const isRoot = ROOT.includes(pathname);
  const title = TITLES[pathname] ?? (pathname.startsWith('/tournament/') ? 'Match' : '');
  const name = userProfile?.username || currentUser?.displayName || 'Player';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-40 bg-black text-white safe-top">
        <div className="h-14 px-3 flex items-center gap-2.5">
          {isRoot ? (
            <img src="/logo192.png" alt="" className="w-9 h-9 object-cover logo-fade" />
          ) : (
            <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-1 grid place-items-center text-[24px] press" aria-label="Back">
              <FiChevronLeft />
            </button>
          )}
          <h1 className="text-[24px] truncate flex-1">{title || <>BATTLE<span className="text-[#f5b301]">ZONE</span></>}</h1>
          <Link to="/notifications" className="relative w-10 h-10 grid place-items-center text-[21px] press" aria-label="Notifications">
            <FiBell className={unread ? 'bell-ring' : ''} />
            {unread > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-live text-white text-[10px] font-bold grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          {currentUser ? (
            <Link to="/profile" className="press"><Avatar name={name} src={userProfile?.photoURL || currentUser.photoURL} size={32} /></Link>
          ) : (
            <Link to="/login" className="h-8 px-3 grid place-items-center bg-[#f5b301] text-black text-[12px] font-bold press">LOG IN</Link>
          )}
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f5b301] to-transparent opacity-70" />
      </header>

      <main className={`flex-1 ${bannerHere ? 'pb-[150px]' : 'pb-[92px]'}`}>{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom bg-black">
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f5b301] to-transparent opacity-60" />
        <div className="relative grid grid-cols-5 h-[64px] max-w-xl mx-auto">
          <Tab to="/" label="Home" icon={FiHome} end />
          <Tab to="/tournaments" label="Matches" icon={FiAward} />

          <NavLink to="/ludo" replace className="relative flex justify-center" aria-label="Play Ludo">
            {({ isActive }) => (
              <span className={`play-btn absolute -top-6 w-[66px] h-[66px] rounded-full grid place-items-center border-4 border-black press ${isActive ? 'on' : ''}`}>
                <span className="text-black font-black text-[13px] leading-none tracking-wide text-center">
                  <span className="block text-[22px] leading-none">🎲</span>PLAY
                </span>
              </span>
            )}
          </NavLink>

          <Tab to="/leaderboard" label="Ranks" icon={FiBarChart2} />
          {currentUser
            ? <Tab to="/settings" label="Settings" icon={FiSettings} />
            : <Tab to="/login" label="Account" icon={FiUser} />}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
