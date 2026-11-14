import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { PageHead, Avatar, Empty, rupees } from '../components/ui';

const SORTS = [['wins', 'Wins'], ['totalEarnings', 'Earnings'], ['kills', 'Kills']];

const Leaderboard = () => {
  const { currentUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('wins');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.role !== 'admin'));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const ranked = useMemo(
    () => [...players].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)),
    [players, sortBy]
  );

  return (
    <div>
      <PageHead kicker="All-time" title="Leaderboard">
        <div className="flex border border-ink">
          {SORTS.map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className={`h-9 px-4 text-[13px] font-semibold border-r border-ink last:border-r-0 ${
                sortBy === v ? 'bg-ink text-white' : 'bg-white hover:bg-[#f1efea]'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </PageHead>

      <div className="wrap py-8">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 skeleton" />)}</div>
        ) : ranked.length === 0 ? (
          <Empty title="No players yet">Rankings fill in once results are posted.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[15px]">
              <thead>
                <tr className="border-b border-ink text-left">
                  <th className="eyebrow font-normal py-3 w-14">#</th>
                  <th className="eyebrow font-normal py-3">Player</th>
                  <th className="eyebrow font-normal py-3 text-right">Wins</th>
                  <th className="eyebrow font-normal py-3 text-right">Kills</th>
                  <th className="eyebrow font-normal py-3 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => {
                  const me = currentUser?.uid === p.id;
                  return (
                    <tr key={p.id} className={`border-b border-line ${me ? 'bg-[#fff4f1]' : ''}`}>
                      <td className={`py-3 num font-bold ${i < 3 ? 'text-accent text-[18px]' : 'text-muted'}`}>{i + 1}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.username} src={p.photoURL} size={32} />
                          <span className="font-semibold">{p.username || 'Player'}</span>
                          {me && <span className="tag border-ink">You</span>}
                        </div>
                      </td>
                      <td className={`py-3 text-right num ${sortBy === 'wins' ? 'font-bold' : ''}`}>{p.wins || 0}</td>
                      <td className={`py-3 text-right num ${sortBy === 'kills' ? 'font-bold' : ''}`}>{p.kills || 0}</td>
                      <td className={`py-3 text-right num ${sortBy === 'totalEarnings' ? 'font-bold' : ''}`}>{rupees(p.totalEarnings)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
