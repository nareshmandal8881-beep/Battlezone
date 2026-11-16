import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUsers, FiCpu, FiSmartphone, FiPlus, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { showInterstitial } from '../lib/ads';
import {
  META, colorsFor, newGame, applyRoll, applyMove, chooseMove, autoPick, rollDie,
} from '../lib/ludoEngine';
import { createRoom, cleanCode } from '../lib/ludoRooms';
import GameScreen from '../components/ludo/GameScreen';

const BOT_TAUNTS = { capture: ['😎', '🤣', '💪', 'Gotcha!'], captured: ['😡', '😭', 'Not again 😩', '😱'] };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------------- menu ---------------- */
const Logo = () => (
  <div className="flex flex-col items-center">
    <div className="lb-logo-die" aria-hidden="true">
      {[0, 2, 4, 6, 8].map((k) => <i key={k} style={{ gridArea: `${Math.floor(k / 3) + 1} / ${(k % 3) + 1}` }} />)}
    </div>
    <h1 className="lb-word mt-3">LUDO</h1>
    <p className="text-[12px] font-extrabold tracking-[0.3em] text-white/75">BATTLEZONE</p>
  </div>
);

const ModeButton = ({ icon: Icon, title, sub, tone, on, onClick }) => (
  <button type="button" onClick={onClick} className={`lb-mode ${tone} ${on ? 'on' : ''} press`}>
    <span className="lb-mode-ic"><Icon /></span>
    <span className="text-left flex-1">
      <span className="block font-black text-[18px] leading-tight">{title}</span>
      <span className="block text-[12px] font-semibold opacity-80">{sub}</span>
    </span>
  </button>
);

const Count = ({ value, onChange, options = [2, 3, 4] }) => (
  <div className="flex gap-2">
    {options.map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)} className={`lb-count flex-1 ${value === n ? 'on' : ''}`}>
        <span className="block font-black text-[20px] leading-none">{n}</span>
        <span className="flex justify-center gap-1 mt-1.5">{colorsFor(n).map((c) => <span key={c} className="w-2.5 h-2.5 rounded-full border border-white/70" style={{ background: META[c].hex }} />)}</span>
      </button>
    ))}
  </div>
);

const Menu = ({ onLocal }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(null);
  const [count, setCount] = useState(2);
  const [roomSize, setRoomSize] = useState(2);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const needLogin = () => {
    if (currentUser) return false;
    toast('Log in to play online');
    navigate('/login', { state: { from: location.pathname } });
    return true;
  };

  const create = async () => {
    if (needLogin()) return;
    setBusy(true);
    try { navigate(`/ludo/room/${await createRoom(currentUser, userProfile, roomSize)}`); } catch (e) { toast.error(e.message || 'Could not create room'); }
    setBusy(false);
  };

  const join = (e) => {
    e.preventDefault();
    if (needLogin()) return;
    const c = cleanCode(code);
    if (c.length !== 6) { toast.error('Room code has 6 letters/numbers'); return; }
    navigate(`/ludo/room/${c}`);
  };

  const startLocal = (cpu) => onLocal(colorsFor(count).map((color, k) => ({
    color,
    ai: cpu && k > 0,
    name: cpu ? (k === 0 ? 'You' : `Bot ${k}`) : `Player ${k + 1}`,
    photo: cpu && k === 0 ? (userProfile?.photoURL || currentUser?.photoURL || null) : null,
  })), cpu);

  return (
    <div className="lb-bg min-h-[calc(100vh-56px)] -mb-[92px] pb-[110px] text-white">
      <div className="max-w-md mx-auto px-5 pt-8">
        <Logo />

        <div className="space-y-3 mt-8">
          <ModeButton icon={FiUsers} tone="gold" title="Play online" sub="Make a room, invite friends with a code" on={mode === 'online'} onClick={() => setMode(mode === 'online' ? null : 'online')} />
          {mode === 'online' && (
            <div className="lb-panel space-y-4 rise">
              <div>
                <p className="lb-label">Create a room</p>
                <Count value={roomSize} onChange={setRoomSize} options={[2, 4]} />
                <button onClick={create} disabled={busy} className="lb-btn gold w-full h-12 mt-3 flex items-center justify-center gap-2"><FiPlus /> {busy ? 'Creating…' : 'Create room'}</button>
              </div>
              <div className="h-px bg-white/20" />
              <form onSubmit={join}>
                <p className="lb-label">Join a room</p>
                <div className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="ROOM CODE" inputMode="text" autoCapitalize="characters"
                    className="flex-1 min-w-0 h-12 px-4 rounded-xl bg-black/25 border-2 border-white/30 text-white text-[20px] font-black tracking-[0.3em] placeholder:text-white/40 placeholder:tracking-[0.15em] placeholder:text-[15px] outline-none focus:border-white" />
                  <button type="submit" className="lb-btn h-12 px-5 flex items-center gap-2"><FiLogIn /> Join</button>
                </div>
              </form>
            </div>
          )}

          <ModeButton icon={FiCpu} tone="red" title="Vs computer" sub="Play against bots, works offline" on={mode === 'cpu'} onClick={() => setMode(mode === 'cpu' ? null : 'cpu')} />
          {mode === 'cpu' && (
            <div className="lb-panel rise">
              <p className="lb-label">Players</p>
              <Count value={count} onChange={setCount} />
              <button onClick={() => startLocal(true)} className="lb-btn gold w-full h-12 mt-3">Start</button>
            </div>
          )}

          <ModeButton icon={FiSmartphone} tone="green" title="Pass & play" sub="Friends on one phone" on={mode === 'pass'} onClick={() => setMode(mode === 'pass' ? null : 'pass')} />
          {mode === 'pass' && (
            <div className="lb-panel rise">
              <p className="lb-label">Players</p>
              <Count value={count} onChange={setCount} />
              <button onClick={() => startLocal(false)} className="lb-btn gold w-full h-12 mt-3">Start</button>
            </div>
          )}
        </div>

        <details className="lb-panel mt-6 text-[13px]">
          <summary className="cursor-pointer font-bold">How to play</summary>
          <ul className="mt-2 space-y-1.5 list-disc pl-5 text-white/85">
            <li>Roll a 6 to bring a piece out.</li>
            <li>A 6, a capture or reaching home gives another roll. Three 6s in a row lose the turn.</li>
            <li>Land on an opponent to send it back, except on star and start squares.</li>
            <li>Exact roll needed to finish. First to bring all 4 home wins.</li>
            <li>Online: 30 seconds per turn, then the computer plays for you.</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

/* ---------------- offline game ---------------- */
const LocalGame = ({ players, cpu, onExit }) => {
  const [s, setS] = useState(() => newGame(players));
  const [messages, setMessages] = useState([]);
  const ref = useRef(s);
  ref.current = s;
  const msgId = useRef(0);

  const say = (color, kind, text) => {
    const p = ref.current.players.find((x) => x.color === color);
    msgId.current += 1;
    setMessages((m) => [...m.slice(-39), { id: `m${msgId.current}`, color, name: p?.name || '', kind, text, ts: Date.now() }]);
  };

  const roll = () => setS((cur) => (cur.phase === 'roll' ? applyRoll(cur, rollDie()) : cur));
  const pick = (i) => setS((cur) => applyMove(cur, i));

  // bots + auto-move, waiting for the dice / walking animation first
  useEffect(() => {
    if (s.phase === 'over') return undefined;
    const p = s.players[s.turn];
    const walk = s.last?.type === 'move' && s.last.from >= 0 ? (s.last.to - s.last.from) * 140 : 0;
    let t;
    if (p.ai && s.phase === 'roll') t = setTimeout(roll, 850 + walk);
    else if (s.phase === 'move') {
      if (p.ai) t = setTimeout(() => setS((cur) => applyMove(cur, chooseMove(cur))), 900);
      else {
        const only = autoPick(s);
        if (only != null) t = setTimeout(() => pick(only), 700);
      }
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.seq]);

  // bots react to captures with an emoji
  useEffect(() => {
    const l = s.last;
    if (!cpu || l?.type !== 'move' || !l.captured) return undefined;
    const t = setTimeout(() => {
      const attacker = s.players.find((p) => p.color === l.color);
      if (attacker?.ai) say(l.color, 'emoji', pickOne(BOT_TAUNTS.capture));
      else {
        const bot = s.players.find((p) => p.ai);
        if (bot) say(bot.color, 'text', pickOne(BOT_TAUNTS.captured));
      }
    }, (l.to - l.from) * 140 + 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.seq]);

  useEffect(() => {
    if (s.phase !== 'over') return undefined;
    const t = setTimeout(showInterstitial, 2500);
    return () => clearTimeout(t);
  }, [s.phase]);

  const human = s.players.filter((p) => !p.ai).map((p) => p.color);

  return (
    <GameScreen
      state={s}
      myColors={human}
      onRoll={roll}
      onPick={pick}
      messages={messages}
      onSend={cpu ? (kind, text) => say(human[0], kind, text) : null}
      title={cpu ? 'VS COMPUTER' : 'PASS & PLAY'}
      onQuit={() => { if (s.phase === 'over' || window.confirm('Quit this game?')) onExit(); }}
      onAgain={() => { setMessages([]); setS(newGame(players)); }}
    />
  );
};

const Ludo = () => {
  const [local, setLocal] = useState(null);
  if (local) return <LocalGame key={local.key} players={local.players} cpu={local.cpu} onExit={() => setLocal(null)} />;
  return <Menu onLocal={(players, cpu) => setLocal({ players, cpu, key: Date.now() })} />;
};

export default Ludo;
