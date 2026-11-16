import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, doc, limitToLast, onSnapshot, orderBy, query,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiCopy, FiShare2, FiChevronLeft } from 'react-icons/fi';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { isApp, SITE_URL, setBackHandler } from '../lib/native';
import { META, applyRoll, applyMove, chooseMove, autoPick, rollDie } from '../lib/ludoEngine';
import {
  joinRoom, startGame, act, leaveRoom, rematch, sendChat, cleanCode, TURN_SECONDS,
} from '../lib/ludoRooms';
import GameScreen, { Face } from '../components/ludo/GameScreen';

const shareInvite = async (code) => {
  const text = `Join my Ludo room on BattleZone. Room code: ${code}`;
  const url = `${SITE_URL}/ludo/room/${code}`;
  try {
    if (isApp) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Ludo room', text, url, dialogTitle: 'Invite friends' });
    } else if (navigator.share) await navigator.share({ title: 'Ludo room', text, url });
    else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Invite copied'); }
  } catch (e) { /* cancelled */ }
};

const Lobby = ({ room, me, onLeave }) => {
  const isHost = room.host === me.uid;
  const seats = Array.from({ length: room.maxPlayers }, (_, k) => room.players[k] || null);
  const [starting, setStarting] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(room.code); toast('Room code copied'); };

  const start = async () => {
    setStarting(true);
    try { await startGame(room.code); } catch (e) { toast.error(e.message || 'Could not start'); }
    setStarting(false);
  };

  return (
    <div className="lb-bg lb-page text-white">
      <div className="px-3 pt-3"><button onClick={onLeave} className="lb-round press" aria-label="Leave room"><FiChevronLeft className="text-[22px]" /></button></div>
      <div className="max-w-md mx-auto px-5 text-center">
        <p className="text-[13px] font-bold text-white/70 tracking-widest uppercase mt-2">Room code</p>
        <button onClick={copy} className="lb-code mt-2 press" aria-label={`Room code ${room.code}, tap to copy`}>
          {room.code.split('').map((ch, k) => <span key={k}>{ch}</span>)}
        </button>
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={copy} className="lb-btn h-11 px-5 flex items-center gap-2"><FiCopy /> Copy</button>
          <button onClick={() => shareInvite(room.code)} className="lb-btn gold h-11 px-5 flex items-center gap-2"><FiShare2 /> Invite friends</button>
        </div>
        <p className="text-[13px] text-white/70 mt-3">Friends open Ludo → Play online → Join room and type this code.</p>

        <div className={`grid gap-3 mt-8 ${room.maxPlayers === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {seats.map((p, k) => (
            <div key={k} className={`lb-seat ${p ? 'on' : ''}`} style={{ '--c': p ? META[p.color].hex : 'rgba(255,255,255,.25)' }}>
              {p ? (
                <>
                  <Face p={p} size={64} />
                  <p className="font-extrabold mt-2 truncate max-w-full">{p.uid === me.uid ? 'You' : p.name}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: META[p.color].light }}>{META[p.color].name}{p.uid === room.host ? ' · host' : ''}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/40 grid place-items-center text-[26px] text-white/50">?</div>
                  <p className="font-bold mt-2 text-white/60 text-[14px]">Waiting…</p>
                  <span className="lb-dots mt-1"><i /><i /><i /></span>
                </>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <button onClick={start} disabled={starting || room.players.length < 2} className="lb-btn gold w-full h-14 mt-8 text-[18px]">
            {room.players.length < 2 ? 'Waiting for players…' : starting ? 'Starting…' : `Start game (${room.players.length} players)`}
          </button>
        ) : (
          <p className="mt-8 font-bold text-white/80">Waiting for the host to start the game…</p>
        )}
      </div>
    </div>
  );
};

const LudoRoom = () => {
  const { code: raw } = useParams();
  const code = cleanCode(raw);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [room, setRoom] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [now, setNow] = useState(Date.now());
  const joinTried = useRef(false);
  const acting = useRef(null);

  // live room + auto-join
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'ludoRooms', code), { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists() && snap.metadata.fromCache) return; // not in the phone cache yet; wait for the server
      setRoom(snap.exists() ? snap.data() : null);
      if (snap.exists() && !joinTried.current && !snap.data().uids.includes(currentUser.uid)) {
        joinTried.current = true;
        joinRoom(code, currentUser, userProfile).then((res) => {
          if (res !== 'joined' && res !== 'already') { toast.error(res); navigate('/ludo', { replace: true }); }
        }).catch(() => { toast.error('Could not join room'); navigate('/ludo', { replace: true }); });
      }
    }, () => setRoom(null));
    return unsub;
  }, [code, currentUser, userProfile, navigate]);

  // live chat
  useEffect(() => {
    const q = query(collection(db, 'ludoRooms', code, 'chat'), orderBy('ts'), limitToLast(40));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
  }, [code]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const g = room?.game;
  const myGamePlayer = g?.players.find((p) => p.uid === currentUser.uid);
  const cur = g ? g.players[g.turn] : null;

  // One action per game step: the local copy updates at once, so block repeats until the seq moves on.
  const run = (fn) => {
    if (!g || acting.current === g.seq) return;
    acting.current = g.seq;
    act(code, room, fn).catch(() => { acting.current = null; toast.error('Connection problem, try again'); });
  };

  // my own auto-move when there is only one sensible choice
  useEffect(() => {
    if (!g || g.phase !== 'move' || cur.uid !== currentUser.uid) return undefined;
    const pick = autoPick(g);
    if (pick == null) return undefined;
    const t = setTimeout(() => run((s) => applyMove(s, pick)), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.seq]);

  // Take over a turn for someone who left or ran out of time. One phone does it: the first other player still here.
  const elapsed = g ? (now - (g.turnAt || now)) / 1000 : 0;
  useEffect(() => {
    if (!g || g.phase === 'over' || !cur || cur.uid === currentUser.uid) return undefined;
    const agent = g.players.find((p) => p.uid !== cur.uid && !p.left && !g.winners.includes(p.color));
    if (agent?.uid !== currentUser.uid) return undefined;
    const due = cur.left ? 1.2 : TURN_SECONDS + 1;
    if (elapsed < due) return undefined;
    run((s) => (s.phase === 'roll' ? applyRoll(s, rollDie()) : applyMove(s, chooseMove(s))));
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.seq, Math.floor(elapsed)]);

  const leave = async () => {
    if (room && room.status === 'playing' && !window.confirm('Leave this game? The computer will play your pieces.')) return;
    try { await leaveRoom(code, currentUser.uid); } catch (e) { /* ignore */ }
    navigate('/ludo', { replace: true });
  };
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  // Android back inside a room = Leave (asks first while a game is running)
  useEffect(() => setBackHandler(() => { leaveRef.current(); return true; }), []);

  if (room === undefined) return <div className="lb-bg lb-page grid place-items-center text-white font-bold">Connecting…</div>;
  if (room === null) {
    return (
      <div className="lb-bg lb-page grid place-items-center text-white text-center px-6">
        <div>
          <p className="text-[24px] font-black">Room {code} not found</p>
          <button onClick={() => navigate('/ludo', { replace: true })} className="lb-btn gold h-12 px-6 mt-5">Back to Ludo</button>
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.uid === currentUser.uid) || { uid: currentUser.uid };
  if (room.status === 'waiting' || !g) return <Lobby room={room} me={me} onLeave={leave} />;

  if (!myGamePlayer) {
    return (
      <div className="lb-bg lb-page grid place-items-center text-white text-center px-6">
        <div>
          <p className="text-[22px] font-black">This game has already started</p>
          <button onClick={() => navigate('/ludo', { replace: true })} className="lb-btn gold h-12 px-6 mt-5">Back to Ludo</button>
        </div>
      </div>
    );
  }

  const timer = cur && !cur.left ? Math.max(0, 1 - elapsed / TURN_SECONDS) : null;
  const isHost = room.host === currentUser.uid;

  return (
    <GameScreen
      state={g}
      myColors={myGamePlayer.left ? [] : [myGamePlayer.color]}
      onRoll={() => run((s) => applyRoll(s, rollDie()))}
      onPick={(i) => run((s) => applyMove(s, i))}
      messages={messages}
      onSend={(kind, text) => sendChat(code, myGamePlayer, kind, text).catch(() => toast.error('Message not sent'))}
      title={`ROOM ${code}`}
      turnTimer={timer}
      onQuit={leave}
      onAgain={isHost ? () => rematch(code).catch((e) => toast.error(e.message)) : null}
      againLabel="Rematch"
      waitingAgain="Host can start a rematch"
    />
  );
};

export default LudoRoom;
