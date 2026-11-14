import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FiSearch } from 'react-icons/fi';
import { db } from '../firebase/config';
import TournamentCard from '../components/TournamentCard';
import { PageHead, Empty } from '../components/ui';

const GAMES = ['All', 'BGMI', 'PUBG', 'Free Fire', 'COD', 'Valorant', 'Custom'];
const STATUSES = [['All', 'Any status'], ['upcoming', 'Open'], ['live', 'Live'], ['completed', 'Ended']];
const SORTS = [['newest', 'Newest'], ['prize_desc', 'Biggest prize'], ['fee_asc', 'Cheapest entry']];

const Tournaments = () => {
  const [params, setParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const game = params.get('game') || 'All';
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
        setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const list = useMemo(() => {
    let r = [...tournaments];
    if (game !== 'All') r = r.filter((t) => t.game === game);
    if (status !== 'All') r = r.filter((t) => t.status === status);
    if (search) r = r.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'prize_desc') r.sort((a, b) => (b.prizePool || 0) - (a.prizePool || 0));
    if (sort === 'fee_asc') r.sort((a, b) => (a.entryFee || 0) - (b.entryFee || 0));
    return r;
  }, [tournaments, game, status, sort, search]);

  const setGame = (g) => (g === 'All' ? setParams({}) : setParams({ game: g }));

  return (
    <div>
      <PageHead kicker={`${list.length} match${list.length === 1 ? '' : 'es'}`} title="Tournaments">
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </PageHead>

      <div className="wrap py-4 border-b border-line flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {GAMES.map((g) => (
            <button key={g} onClick={() => setGame(g)}
              className={`h-9 px-3.5 text-[13px] font-semibold border transition-colors ${
                game === g ? 'bg-ink text-white border-ink' : 'bg-white border-line hover:border-ink'
              }`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <select className="field h-9 text-[13px] w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field h-9 text-[13px] w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="wrap py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[360px] skeleton" />)}
          </div>
        ) : list.length === 0 ? (
          <Empty title="Nothing matches those filters">Try another game or clear the search.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((t) => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
