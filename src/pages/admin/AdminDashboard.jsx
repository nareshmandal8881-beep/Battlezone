import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { PageHead, StatusTag, rupees } from '../../components/ui';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ tournaments: 0, players: 0, revenue: 0, live: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tSnap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
        const ts = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pSnap = await getDocs(collection(db, 'payments'));
        const revenue = pSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const uSnap = await getDocs(collection(db, 'users'));
        const players = uSnap.docs.filter((d) => d.data().role !== 'admin').length;
        setStats({ tournaments: ts.length, players, revenue, live: ts.filter((t) => t.status === 'live').length });
        setRecent(ts.slice(0, 8));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHead kicker="Admin" title="Dashboard">
        <div className="flex gap-2">
          <Link to="/admin/create" className="btn btn-dark">New tournament</Link>
          <Link to="/admin/manage" className="btn btn-light">Manage</Link>
        </div>
      </PageHead>

      <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-ink">
        {[
          ['Tournaments', stats.tournaments],
          ['Players', stats.players],
          ['Revenue', rupees(stats.revenue)],
          ['Live now', stats.live],
        ].map(([k, v]) => (
          <div key={k} className="wrap py-6 border-r border-b md:border-b-0 border-line">
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-[30px] font-bold mt-1">{loading ? '—' : v}</dd>
          </div>
        ))}
      </dl>

      <section className="wrap py-10">
        <h2 className="text-[32px] mb-5">Recent</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-b border-ink text-left">
                {['Name', 'Game', 'Status', 'Players', 'Entry', 'Prize'].map((h) => (
                  <th key={h} className="eyebrow font-normal py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b border-line">
                  <td className="py-3 font-semibold"><Link to={`/tournament/${t.id}`} className="hover:underline">{t.name}</Link></td>
                  <td className="py-3">{t.game}</td>
                  <td className="py-3"><StatusTag status={t.status} /></td>
                  <td className="py-3 num">{t.registeredPlayers?.length || 0}/{t.maxSlots}</td>
                  <td className="py-3 num">{rupees(t.entryFee)}</td>
                  <td className="py-3 num font-bold">{rupees(t.prizePool)}</td>
                </tr>
              ))}
              {!loading && recent.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted">
                  No tournaments yet. <Link to="/admin/create" className="underline text-ink">Create the first one</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
