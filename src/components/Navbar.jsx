import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import { DownloadAppButton } from './DownloadApp';

export const Wordmark = () => (
  <Link to="/" className="flex items-center gap-2.5 leading-none">
    <img src="/logo192.png" alt="" className="w-10 h-10 object-cover border border-ink" />
    <span className="display text-[22px] tracking-tight">BattleZone</span>
  </Link>
);

const links = [
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Ludo', path: '/ludo' },
  { label: 'Settings', path: '/settings', auth: true },
];

const linkClass = ({ isActive }) =>
  `text-[14px] font-medium py-1 border-b-2 transition-colors ${
    isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
  }`;

const Navbar = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    toast('Signed out');
    navigate('/');
  };

  const name = userProfile?.username || currentUser?.displayName || 'Player';
  const isAdmin = userProfile?.role === 'admin';

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-ink">
      <div className="wrap h-16 flex items-center justify-between gap-6">
        <Wordmark />

        <div className="hidden md:flex items-center gap-7 mr-auto ml-6">
          {links.filter((l) => !l.auth || currentUser).map((l) => (
            <NavLink key={l.path} to={l.path} className={linkClass}>{l.label}</NavLink>
          ))}
          {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <DownloadAppButton className="text-[14px] font-medium inline-flex items-center gap-1.5 hover:underline underline-offset-4 px-1" label="App" />
          {currentUser ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 pr-1 hover:underline underline-offset-4">
                <Avatar name={name} src={currentUser.photoURL} size={30} />
                <span className="text-[14px] font-medium">{name}</span>
              </Link>
              <button onClick={handleLogout} className="btn btn-light btn-sm">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[14px] font-medium hover:underline underline-offset-4 px-2">Log in</Link>
              <Link to="/register" className="btn btn-dark btn-sm">Create account</Link>
            </>
          )}
        </div>

        <button className="md:hidden text-2xl" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-line wrap py-3 flex flex-col">
          {links.filter((l) => !l.auth || currentUser).map((l) => (
            <Link key={l.path} to={l.path} onClick={() => setOpen(false)} className="py-3 border-b border-line font-medium">{l.label}</Link>
          ))}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-3 border-b border-line font-medium">Admin</Link>}
          <DownloadAppButton className="py-3 border-b border-line font-medium inline-flex items-center gap-2" label="Download Android app" />
          {currentUser ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)} className="py-3 border-b border-line font-medium">My profile</Link>
              <button onClick={handleLogout} className="py-3 text-left font-medium text-live">Sign out</button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn btn-light">Log in</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn btn-dark">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
