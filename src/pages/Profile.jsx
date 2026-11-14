import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { db, storage, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Avatar, StatusTag, Empty, rupees } from '../components/ui';
import { isAdminUser } from '../lib/admin';

const Profile = () => {
  const { currentUser, fetchUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [mine, setMine] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        setProfile(data);
        setNewName(data.username || currentUser.displayName || '');

        const tSnap = await getDocs(query(collection(db, 'tournaments'), where('registeredPlayers', 'array-contains', currentUser.uid)));
        setMine(tSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const pSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', currentUser.uid)));
        setPayments(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [currentUser]);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Image must be under 3 MB'); return; }
    setUploading(true);
    try {
      const r = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateProfile(auth.currentUser, { photoURL: url });
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url });
      setProfile((p) => ({ ...p, photoURL: url }));
      toast.success('Photo updated');
    } catch (err) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const saveName = async () => {
    const name = newName.trim();
    if (name.length < 3) { toast.error('At least 3 characters'); return; }
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, 'users', currentUser.uid), { username: name });
      setProfile((p) => ({ ...p, username: name }));
      fetchUserProfile(currentUser.uid);
      setEditing(false);
      toast.success('Name saved');
    } catch (err) {
      toast.error('Could not save');
    }
  };

  if (loading) return <div className="wrap py-16"><div className="h-40 skeleton" /></div>;

  const name = profile?.username || currentUser.displayName || 'Player';
  const spent = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div>
      <header className="wrap py-10 border-b border-ink flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="relative">
          <Avatar name={name} src={profile?.photoURL || currentUser.photoURL} size={96} />
          <button onClick={() => fileRef.current.click()} disabled={uploading}
            className="absolute -bottom-2 -right-2 btn btn-light btn-sm h-7 px-2 text-[11px]">
            {uploading ? '…' : 'Change'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
        </div>
        <div className="flex-1">
          <p className="eyebrow mb-2">{isAdminUser(currentUser, profile) ? 'Admin' : 'Player'}</p>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input className="field max-w-xs" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={24} autoFocus />
              <button onClick={saveName} className="btn btn-dark">Save</button>
              <button onClick={() => setEditing(false)} className="btn btn-light">Cancel</button>
            </div>
          ) : (
            <div className="flex items-baseline gap-3">
              <h1 className="text-[44px] sm:text-[56px]">{name}</h1>
              <button onClick={() => setEditing(true)} className="text-[13px] underline text-muted hover:text-ink">Edit</button>
            </div>
          )}
          <p className="text-muted mt-1">{currentUser.email}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-ink">
        {[
          ['Matches', mine.length],
          ['Wins', profile?.wins || 0],
          ['Kills', profile?.kills || 0],
          ['Earnings', rupees(profile?.totalEarnings)],
        ].map(([k, v], i) => (
          <div key={k} className={`wrap py-6 border-line ${i % 2 === 0 ? 'border-r' : ''} md:border-r md:last:border-r-0 ${i < 2 ? 'border-b md:border-b-0' : ''}`}>
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-[30px] font-bold mt-1">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="wrap py-10">
        <h2 className="text-[32px] mb-5">My matches</h2>
        {mine.length === 0 ? (
          <Empty title="You haven't joined a match yet">
            <Link to="/tournaments" className="underline text-ink">Find one</Link>
          </Empty>
        ) : (
          <ul className="border-t border-ink">
            {mine.map((t) => (
              <li key={t.id} className="border-b border-line">
                <Link to={`/tournament/${t.id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-[#faf9f6] -mx-2 px-2">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-[13px] text-muted num">{t.game} · {t.date} {t.time}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="num font-bold hidden sm:inline">{rupees(t.prizePool)}</span>
                    <StatusTag status={t.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wrap pb-6">
        <h2 className="text-[32px] mb-5">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-muted text-[14px]">No payments yet.</p>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="eyebrow font-normal py-2">Match</th>
                <th className="eyebrow font-normal py-2 hidden sm:table-cell">Payment ID</th>
                <th className="eyebrow font-normal py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-3">{p.tournamentName}</td>
                  <td className="py-3 font-mono text-[12px] text-muted hidden sm:table-cell">{p.razorpayPaymentId}</td>
                  <td className="py-3 text-right num font-bold">{rupees(p.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 font-semibold">Total</td>
                <td className="hidden sm:table-cell" />
                <td className="py-3 text-right num font-bold">{rupees(spent)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Profile;
