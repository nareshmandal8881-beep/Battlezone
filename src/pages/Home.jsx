import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import TournamentCard from '../components/TournamentCard';
import { Empty } from '../components/ui';

const GAMES = ['BGMI', 'PUBG', 'Free Fire', 'COD', 'Valorant', 'Custom'];

const STEPS = [
  ['Sign up', 'Email or Google. Takes about twenty seconds.'],
  ['Book a slot', 'Pick a match, pay the entry with UPI or card. Free rooms need no payment.'],
  ['Get the room', 'Room ID and password show up on the match page once it goes live.'],
  ['Play & get paid', 'Results are posted after the match. Winnings go to your profile.'],
];

const Home = () => {
  const { currentUser } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(6));
        const snap = await getDocs(q);
        setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const live = tournaments.filter((t) => t.status === 'live');

  return (
    <div>
      {/* Hero */}
      <section className="wrap pt-12 sm:pt-16 pb-10 border-b border-ink grid lg:grid-cols-[1.4fr_1fr] gap-10 items-end">
        <div>
          <p className="eyebrow mb-5">Custom-room tournaments · India</p>
          <h1 className="text-[56px] sm:text-[88px] lg:text-[104px] uppercase">
            Drop in.<br />Play the room.<br /><span className="text-accent">Take the pot.</span>
          </h1>
        </div>
        <div className="lg:pb-3">
          <p className="text-[17px] leading-relaxed text-[#3a3834] max-w-md">
            Book a slot in BGMI, Free Fire, COD and Valorant matches. Entry fees are small, prize splits are listed up front,
            and the room details land right here when it's time to play.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/tournaments" className="btn btn-dark">Browse matches</Link>
            {!currentUser && <Link to="/register" className="btn btn-light">Create account</Link>}
          </div>
        </div>
      </section>

      {/* Game strip */}
      <section className="border-b border-ink overflow-x-auto">
        <div className="flex min-w-max">
          {GAMES.map((g) => (
            <Link key={g} to={`/tournaments?game=${encodeURIComponent(g)}`}
              className="px-6 sm:px-8 py-4 border-r border-line text-[15px] font-semibold hover:bg-ink hover:text-white transition-colors">
              {g}
            </Link>
          ))}
        </div>
      </section>

      {/* Live now */}
      {live.length > 0 && (
        <section className="wrap py-4 border-b border-line bg-[#fff4f1] flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]">
          <span className="tag border-live text-live bg-white"><span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />Live now</span>
          {live.map((t) => (
            <Link key={t.id} to={`/tournament/${t.id}`} className="font-semibold underline underline-offset-4">{t.name}</Link>
          ))}
        </section>
      )}

      {/* Latest */}
      <section className="wrap py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="eyebrow mb-2">Latest</p>
            <h2 className="text-[40px]">Upcoming matches</h2>
          </div>
          <Link to="/tournaments" className="text-[14px] font-semibold underline underline-offset-4">See all →</Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-[360px] skeleton" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <Empty title="No matches posted yet">New tournaments appear here as soon as an admin creates them.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-ink">
        <div className="wrap pt-10 pb-2"><p className="eyebrow">How it works</p></div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="wrap py-8 border-t sm:border-r border-line last:border-r-0">
              <span className="num text-[13px] text-accent font-bold">0{i + 1}</span>
              <h3 className="text-[26px] mt-2 mb-2">{title}</h3>
              <p className="text-muted text-[14px] leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {!currentUser && (
        <section className="wrap py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h2 className="text-[40px] sm:text-[52px] max-w-xl">Next room opens soon. Get your name on the list.</h2>
          <Link to="/register" className="btn btn-dark h-12 px-7">Create free account</Link>
        </section>
      )}
    </div>
  );
};

export default Home;
