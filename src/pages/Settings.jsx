import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiUser, FiShield, FiShare2, FiRefreshCw, FiLock, FiLogOut, FiChevronRight, FiFileText, FiMail, FiDownload, FiBell,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { Avatar, PageHead, rupees } from '../components/ui';
import { isApp, shareApp, reloadApp } from '../lib/native';
import { APK_URL } from '../components/DownloadApp';
import buildInfo from '../buildInfo.json';
import { isAdminUser } from '../lib/admin';
import { notificationPermission, askNotificationPermission } from '../lib/notify';

const Row = ({ icon: Icon, label, hint, to, href, onClick, danger }) => {
  const inner = (
    <>
      <span className={`w-9 h-9 grid place-items-center border ${danger ? 'border-live text-live' : 'border-line'} text-[17px]`}><Icon /></span>
      <span className="flex-1 min-w-0">
        <span className={`block font-semibold text-[15px] ${danger ? 'text-live' : ''}`}>{label}</span>
        {hint && <span className="block text-[12px] text-muted truncate">{hint}</span>}
      </span>
      {!danger && <FiChevronRight className="text-muted" />}
    </>
  );
  const cls = 'flex items-center gap-3 py-3 px-4 sm:px-8 border-b border-line w-full text-left hover:bg-[#faf9f6] press';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer">{inner}</a>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};

const Group = ({ title, children }) => (
  <section className="mt-6">
    <p className="eyebrow px-4 sm:px-8 mb-2">{title}</p>
    <div className="border-t border-line stagger">{children}</div>
  </section>
);

const Settings = () => {
  const { currentUser, userProfile, logout, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState('prompt');
  useEffect(() => { notificationPermission().then(setNotif); }, []);
  const enableNotif = async () => {
    if (notif === 'granted') { toast('Notifications are already on'); return; }
    if (notif === 'denied') { toast('Blocked earlier. Open phone Settings → Apps → BattleZone → Notifications and turn them on.', { duration: 6000 }); return; }
    const s = await askNotificationPermission();
    setNotif(s);
    toast(s === 'granted' ? 'Notifications on' : 'Notifications still off');
  };
  const [checking, setChecking] = useState(false);

  const name = userProfile?.username || currentUser?.displayName || 'Player';
  const isAdmin = isAdminUser(currentUser, userProfile);
  const hasPassword = currentUser?.providerData?.some((p) => p.providerId === 'password');

  const checkUpdate = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      const live = await res.json();
      if (live.id && live.id !== buildInfo.id && process.env.NODE_ENV === 'production') {
        toast('New version found — updating…');
        setTimeout(reloadApp, 700);
      } else {
        toast.success("You're on the latest version");
      }
    } catch (e) {
      toast.error('Could not check. Are you online?');
    }
    setChecking(false);
  };

  const changePassword = async () => {
    try {
      await resetPassword(currentUser.email);
      toast.success(`Reset link sent to ${currentUser.email}`);
    } catch (e) {
      toast.error('Could not send the email');
    }
  };

  const onShare = async () => {
    const r = await shareApp();
    if (r === 'copied') toast('Link copied');
  };

  const onLogout = async () => {
    if (!window.confirm('Sign out of BattleZone?')) return;
    await logout();
    toast('Signed out');
    navigate(isApp ? '/login' : '/', { replace: true });
  };

  return (
    <div className="pb-10">
      <PageHead kicker="Account" title="Settings" />

      <Link to="/profile" className="flex items-center gap-4 px-4 sm:px-8 py-5 border-b border-ink press">
        <Avatar name={name} src={userProfile?.photoURL || currentUser?.photoURL} size={60} />
        <div className="flex-1 min-w-0">
          <p className="text-[22px] display truncate">{name}</p>
          <p className="text-[13px] text-muted truncate">{currentUser?.email}</p>
          <p className="text-[12px] mt-1 num">
            {userProfile?.wins || 0} wins · {userProfile?.kills || 0} kills · {rupees(userProfile?.totalEarnings)}
          </p>
        </div>
        <FiChevronRight className="text-muted" />
      </Link>

      <Group title="Account">
        <Row icon={FiUser} label="Edit profile" hint="Name, photo, match history, payments" to="/profile" />
        {hasPassword && <Row icon={FiLock} label="Change password" hint="We'll email you a reset link" onClick={changePassword} />}
        {isAdmin && <Row icon={FiShield} label="Admin panel" hint="Create matches, set room ID, see players" to="/admin" />}
        {isAdmin && <Row icon={FiBell} label="Send notification" hint="Message every player" to="/admin/notify" />}
      </Group>

      <Group title="App">
        <Row icon={FiBell} label={`Phone alerts: ${notif === 'granted' ? 'On' : 'Off'}`}
          hint={notif === 'granted' ? 'Pop-ups for new matches and room IDs'
            : notif === 'denied' ? 'Blocked. Turn on in phone Settings → Apps → BattleZone → Notifications'
            : notif === 'unsupported' ? 'Not supported on this browser' : 'Tap to allow pop-up notifications'}
          onClick={enableNotif} />
        <Row icon={FiBell} label="Notifications" hint="Announcements and match updates" to="/notifications" />
        <Row icon={FiRefreshCw} label={checking ? 'Checking…' : 'Check for updates'} hint={`Version ${new Date(buildInfo.builtAt).toLocaleDateString('en-IN')} · ${buildInfo.id.slice(-6)}`} onClick={checkUpdate} />
        <Row icon={FiShare2} label="Share BattleZone" hint="Invite your squad" onClick={onShare} />
        {!isApp && <Row icon={FiDownload} label="Download Android app" hint="APK · about 7 MB" href={APK_URL} />}
      </Group>

      <Group title="Help">
        <Row icon={FiMail} label="Contact support" hint="Payment or match issues" href="mailto:naftieshmandal02@gmail.com?subject=BattleZone%20support" />
        <Row icon={FiFileText} label="Rules & refund policy" hint="How matches and refunds work" to="/tournaments" />
      </Group>

      <Group title=" ">
        <Row icon={FiLogOut} label="Sign out" onClick={onLogout} danger />
      </Group>
    </div>
  );
};

export default Settings;
