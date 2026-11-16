import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiCopy, FiLock } from 'react-icons/fi';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { StatusTag, rupees } from '../components/ui';
import { isAdminUser } from '../lib/admin';

// Public Key ID only. Never put the Key Secret in app code.
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_live_U06RvXvCE0EA53';

const DEFAULT_RULES = `1. Register before the match starts.
2. Play only from the account you registered with.
3. No hacks, emulators (unless allowed) or teaming.
4. Room ID and password are shared 10 minutes before start.
5. Be in the room 5 minutes before start time.
6. The admin's decision is final in disputes.`;

const copy = (text) => {
  navigator.clipboard?.writeText(text);
  toast('Copied');
};

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Live listener: room ID / password, teams and player count update on screen the moment the admin saves them.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', id), (snap) => {
      if (snap.exists() && (snap.data().published !== false || isAdminUser(currentUser, userProfile))) setT({ id: snap.id, ...snap.data() });
      else setT(null);
      setLoading(false);
    }, () => {
      toast.error('Could not load this match');
      setLoading(false);
    });
    return unsub;
  }, [id, currentUser, userProfile]);

  const hasJoined = !!(currentUser && t?.registeredPlayers?.includes(currentUser.uid));

  const markJoined = async (paymentId) => {
    if (paymentId) {
      await addDoc(collection(db, 'payments'), {
        userId: currentUser.uid,
        tournamentId: id,
        tournamentName: t.name,
        amount: t.entryFee,
        razorpayPaymentId: paymentId,
        status: 'success',
        createdAt: serverTimestamp(),
      });
    }
    await updateDoc(doc(db, 'tournaments', id), { registeredPlayers: arrayUnion(currentUser.uid) });
    await updateDoc(doc(db, 'users', currentUser.uid), { tournamentsJoined: arrayUnion(id) });
    setT((p) => ({ ...p, registeredPlayers: [...(p.registeredPlayers || []), currentUser.uid] }));
  };

  const handleJoin = async () => {
    if (!currentUser) {
      toast('Log in to book a slot');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (hasJoined) return;

    if (!t.entryFee) {
      setPaying(true);
      try {
        await markJoined(null);
        toast.success("You're in");
      } catch (e) {
        toast.error('Could not join. Try again.');
      }
      setPaying(false);
      return;
    }

    if (!RAZORPAY_KEY) { toast.error('Payments not set up yet (Razorpay key missing).'); return; }
    if (!window.Razorpay) { toast.error('Payment window failed to load. Refresh and retry.'); return; }

    setPaying(true);
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY,
      amount: t.entryFee * 100,
      currency: 'INR',
      name: 'BattleZone',
      description: t.name,
      prefill: { name: currentUser.displayName || '', email: currentUser.email || '' },
      theme: { color: '#121212' },
      handler: async (res) => {
        try {
          await markJoined(res.razorpay_payment_id);
          toast.success("Payment done — you're in");
        } catch (e) {
          toast.error(`Paid, but joining failed. Send support this ID: ${res.razorpay_payment_id}`);
        }
        setPaying(false);
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.on('payment.failed', () => { toast.error('Payment failed'); setPaying(false); });
    rzp.open();
  };

  if (loading) return <div className="wrap py-20"><div className="h-64 skeleton" /></div>;
  if (!t) {
    return (
      <div className="wrap py-24 text-center">
        <h1 className="text-[40px] mb-3">Match not found</h1>
        <Link to="/tournaments" className="underline">Back to tournaments</Link>
      </div>
    );
  }

  const joined = t.registeredPlayers?.length || 0;
  const left = Math.max((t.maxSlots || 0) - joined, 0);
  const fill = t.maxSlots ? Math.min((joined / t.maxSlots) * 100, 100) : 0;
  const prizes = [
    ['1st place', t.prize1 ?? Math.floor((t.prizePool || 0) * 0.5)],
    ['2nd place', t.prize2 ?? Math.floor((t.prizePool || 0) * 0.3)],
    ['3rd place', t.prize3 ?? Math.floor((t.prizePool || 0) * 0.15)],
    ['Per kill', t.killPrize ?? 0],
  ];

  const buttonLabel = paying ? 'Processing…'
    : hasJoined ? "You're registered"
    : t.status === 'completed' ? 'Match ended'
    : left === 0 ? 'Full'
    : !t.entryFee ? 'Join free' : `Pay ${rupees(t.entryFee)} & join`;

  return (
    <div>
      {t.bannerUrl && (
        <div className="aspect-[16/5] border-b border-ink overflow-hidden bg-[#f1efea]">
          <img src={t.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <header className="wrap pt-8 pb-8 border-b border-ink">
        <div className="flex items-center gap-3 mb-4">
          <StatusTag status={t.status} />
          <span className="eyebrow">{[t.game, t.mode, t.teamSize, t.map].filter(Boolean).join(' · ')}</span>
        </div>
        <h1 className="text-[44px] sm:text-[64px] max-w-4xl">{t.name}</h1>
        <p className="num text-muted mt-3">{t.date}{t.time && ` · ${t.time}`}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="lg:border-r border-ink">
          {/* Room */}
          {hasJoined && (
            <section className="wrap py-8 border-b border-line">
              <p className="eyebrow mb-4">Room details</p>
              {(t.roomId || t.roomPassword) ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[['Room ID', t.roomId], ['Password', t.roomPassword]].map(([label, val]) => (
                    <div key={label} className="border border-ink p-4 flex items-center justify-between">
                      <div>
                        <p className="eyebrow">{label}</p>
                        <p className="num text-[24px] font-bold mt-1">{val || '—'}</p>
                      </div>
                      {val && <button onClick={() => copy(val)} className="btn btn-light btn-sm" aria-label={`Copy ${label}`}><FiCopy /></button>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 border border-dashed border-line p-5 text-[14px]">
                  <FiLock className="text-muted shrink-0" />
                  You're registered. Room ID and password will appear here as soon as the admin posts them.
                </div>
              )}
            </section>
          )}

          {(t.teams?.A?.length || t.teams?.B?.length) ? (
            <section className="wrap py-8 border-b border-line">
              <p className="eyebrow mb-4">Teams{t.teamSize ? ` · ${t.teamSize}` : ''}</p>
              <div className="grid grid-cols-2 gap-3">
                {[['A', t.teams.A || []], ['B', t.teams.B || []]].map(([k, list]) => (
                  <div key={k} className={`border p-4 ${list.some((x) => x.uid === currentUser?.uid) ? 'border-accent' : 'border-ink'}`}>
                    <p className={`font-bold text-[16px] mb-2 ${k === 'A' ? 'text-accent' : ''}`}>Team {k}</p>
                    <ol className="space-y-1 text-[14px]">
                      {list.map((x, i) => (
                        <li key={x.uid} className="truncate">
                          <span className="num text-muted mr-2">{i + 1}</span>{x.name}{x.uid === currentUser?.uid && <b> (you)</b>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="wrap py-8 border-b border-line">
            <p className="eyebrow mb-4">Prize split</p>
            <table className="w-full text-[15px]">
              <tbody>
                {prizes.map(([label, amt], i) => (
                  <tr key={label} className="border-t border-line">
                    <td className="py-3">{label}</td>
                    <td className={`py-3 text-right num font-bold ${i === 0 ? 'text-accent' : ''}`}>{rupees(amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="wrap py-8">
            <p className="eyebrow mb-4">Rules</p>
            <div className="text-[15px] leading-7 whitespace-pre-wrap text-[#2d2b28] max-w-2xl">{t.rules || DEFAULT_RULES}</div>
          </section>
        </div>

        {/* Join panel */}
        <aside className="border-t lg:border-t-0 border-ink">
          <div className="wrap lg:px-6 py-8 lg:sticky lg:top-16">
            <dl className="divide-y divide-line border-y border-line text-[14px]">
              {[
                ['Entry fee', t.entryFee ? rupees(t.entryFee) : 'Free'],
                ['Prize pool', rupees(t.prizePool)],
                ['Players', `${joined} / ${t.maxSlots}`],
                ['Slots left', left],
                ['Start', t.time || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="h-1 bg-[#ebe8e1] mt-5"><div className="h-1 bg-ink" style={{ width: `${fill}%` }} /></div>

            <button onClick={handleJoin}
              disabled={paying || hasJoined || t.status === 'completed' || left === 0}
              className="btn btn-dark w-full h-12 mt-6 text-[15px]">
              {buttonLabel}
            </button>
            {!currentUser && (
              <p className="text-[13px] text-muted mt-3 text-center">You'll be asked to log in first.</p>
            )}
            {!!t.entryFee && <p className="font-mono text-[11px] text-muted mt-4 text-center">UPI · cards · netbanking via Razorpay</p>}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TournamentDetail;
