import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { FiChevronRight, FiAward, FiBarChart2, FiUser, FiShield } from 'react-icons/fi';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { StatusTag, Empty, rupees } from '../components/ui';
import { isAdminUser } from '../lib/admin';
import { useGames, isPublished } from '../lib/games';


const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const MatchRow = ({ t }) => {
  const joined = t.registeredPlayers?.length || 0;
  return (
    <Link to={`/tournament/${t.id}`} className="flex gap-3 px-4 py-3 border-b border-line press">
      <div className="w-[72px] h-[72px] shrink-0 border border-line bg-[#f1efea] overflow-hidden grid place-items-center">
        {t.bannerUrl
          ? <img src={t.bannerUrl} alt="" className="w-full h-full object-cover" />
          : <span className="display text-[15px] text-[#bdb8ad] uppercase text-center leading-none px-1">{t.game}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5"><StatusTag status={t.status} /><span className="eyebrow truncate">{[t.game, t.mode, t.teamSize, t.map].filter(Boolean).join(' · ')}</span></div>
        <p className="font-bold text-[15px] truncate">{t.name}</p>
        <p className="text-[12px] text-muted num mt-0.5">
          {t.entryFee ? rupees(t.entryFee) : 'Free'} entry · <b className="text-accent">{rupees(t.prizePool)}</b> · {joined}/{t.maxSlots}
        </p>
        <p className="text-[12px] text-muted num">{t.date} {t.time}</p>
      </div>
      <FiChevronRight className="self-center text-muted shrink-0" />
    </Link>
  );
};

const AppHome = () => {
  const { currentUser, userProfile } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(20)));
        setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isPublished));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const name = userProfile?.username || currentUser?.displayName || 'Player';
  const live = list.filter((t) => t.status === 'live');
  const upcoming = list.filter((t) => t.status !== 'live' && t.status !== 'completed');
  const mine = list.filter((t) => t.registeredPlayers?.includes(currentUser?.uid) && t.status !== 'completed');
  const isAdmin = isAdminUser(currentUser, userProfile);
  const games = useGames();

  return (
    <div>
      <section className="relative overflow-hidden bg-black text-white px-4 pt-6 pb-5">
        <img src="/splash-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[center_70%] opacity-60 bg-zoom" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/90" />
        <div className="relative">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#f5b301]">{currentUser ? greeting() : 'Welcome, soldier'}</p>
          <h2 className="text-[38px] truncate rise">{currentUser ? name : 'Ready to drop?'}</h2>
          {currentUser ? (
            <div className="grid grid-cols-3 border border-[#f5b301]/60 bg-black/50 backdrop-blur-sm mt-4 shine">
              {[['Wins', userProfile?.wins || 0], ['Kills', userProfile?.kills || 0], ['Won', rupees(userProfile?.totalEarnings)]].map(([k, v], i) => (
                <div key={k} className={`px-3 py-2.5 ${i < 2 ? 'border-r border-[#f5b301]/40' : ''}`}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">{k}</p>
                  <p className="num font-bold text-[18px] truncate text-[#f5b301]">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Link to="/register" className="h-11 px-5 grid place-items-center bg-[#f5b301] text-black font-bold text-[14px] press">Create account</Link>
              <Link to="/login" className="h-11 px-5 grid place-items-center border border-white/70 font-bold text-[14px] press">Log in</Link>
            </div>
          )}
        </div>
      </section>

      <Link to="/ludo" className="relative block overflow-hidden mx-4 mt-4 bg-black text-white press">
        <img src="/auth-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="relative flex items-center gap-4 p-4">
          <div className="ludo-mini shrink-0" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#f5b301]">NEW · FREE TO PLAY</p>
            <p className="display text-[30px] leading-none">LUDO</p>
            <p className="text-[12px] text-white/75 mt-1">Vs computer or pass &amp; play with 2–4 friends</p>
          </div>
          <span className="h-10 px-4 grid place-items-center bg-[#f5b301] text-black font-black text-[13px]">PLAY ▸</span>
        </div>
      </Link>

      <section className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} border-b border-line stagger mt-4 border-t`}>
        {[
          { to: '/tournaments', icon: FiAward, label: 'Matches' },
          { to: '/leaderboard', icon: FiBarChart2, label: 'Ranks' },
          { to: currentUser ? '/profile' : '/login', icon: FiUser, label: 'Profile' },
          ...(isAdmin ? [{ to: '/admin', icon: FiShield, label: 'Admin' }] : []),
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-1.5 py-4 border-r border-line last:border-r-0 press">
            <span className="w-11 h-11 grid place-items-center border border-ink text-[20px]"><Icon /></span>
            <span className="text-[12px] font-semibold">{label}</span>
          </Link>
        ))}
      </section>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-line [scrollbar-width:none]">
        {games.map(({ id, name, color, imageUrl }) => (
          <Link key={id} to={name === 'Ludo' ? '/ludo' : `/tournaments?game=${encodeURIComponent(name)}`}
            className="shrink-0 h-9 pl-2 pr-4 flex items-center gap-2 border border-ink text-[13px] font-semibold press">{imageUrl ? <img src={imageUrl} alt="" className="w-6 h-6 object-cover" /> : <span className="w-2.5 h-5" style={{ background: color }} />}{name}</Link>
        ))}
      </div>

      {live.length > 0 && (
        <section>
          <p className="eyebrow px-4 pt-5 pb-2 !text-live flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-live ping text-live" /> Live now</p>
          <div className="border-t border-line bg-[#fff8f6] stagger">{live.map((t) => <MatchRow key={t.id} t={t} />)}</div>
        </section>
      )}

      {mine.length > 0 && (
        <section>
          <p className="eyebrow px-4 pt-5 pb-2">My matches</p>
          <div className="border-t border-line stagger">{mine.map((t) => <MatchRow key={t.id} t={t} />)}</div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between px-4 pt-5 pb-2">
          <p className="eyebrow">Upcoming</p>
          <Link to="/tournaments" className="text-[13px] font-semibold underline underline-offset-2">See all</Link>
        </div>
        {loading ? (
          <div className="px-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-[88px] skeleton" />)}</div>
        ) : upcoming.length === 0 ? (
          <div className="px-4"><Empty title="No open matches right now">Pull down later or check back soon.</Empty></div>
        ) : (
          <div className="border-t border-line stagger">{upcoming.slice(0, 8).map((t) => <MatchRow key={t.id} t={t} />)}</div>
        )}
      </section>
    </div>
  );
};

export default AppHome;
