import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';
import { play, isMuted, setMuted } from '../lib/sound';

/* ---------------- board geometry (15 × 15 grid) ---------------- */
const COLORS = ['red', 'green', 'yellow', 'blue']; // clockwise turn order
const META = {
  red: { name: 'Red', hex: '#ef3e4a', dark: '#a3121c', soft: '#fde3e3', start: 0 },
  green: { name: 'Green', hex: '#22b85f', dark: '#0d6b33', soft: '#ddf5e7', start: 13 },
  yellow: { name: 'Yellow', hex: '#ffc21a', dark: '#b07800', soft: '#fff3cf', start: 26 },
  blue: { name: 'Blue', hex: '#3d7bff', dark: '#1641a8', soft: '#e0eafc', start: 39 },
};

// 52 shared squares, clockwise, starting at Red's start square.
const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];
const HOME = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};
// token centres (in cell units) while waiting in the base
const BASE = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  green: [[2, 11], [2, 13], [4, 11], [4, 13]],
  yellow: [[11, 11], [11, 13], [13, 11], [13, 13]],
  blue: [[11, 2], [11, 4], [13, 2], [13, 4]],
};
const BASE_ORIGIN = { red: [0, 0], green: [0, 9], yellow: [9, 9], blue: [9, 0] };
const FINISH = { red: [7.5, 6.55], green: [6.55, 7.5], yellow: [7.5, 8.45], blue: [8.45, 7.5] };
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const LAST = 56; // 0-50 track, 51-55 home column, 56 finished

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const absOf = (color, pos) => (META[color].start + pos) % 52;
const canMove = (pos, d) => (pos === -1 ? d === 6 : pos !== LAST && pos + d <= LAST);

const centerOf = (color, pos, i) => {
  if (pos === -1) return BASE[color][i];
  if (pos === LAST) return FINISH[color];
  const [r, c] = pos >= 51 ? HOME[color][pos - 51] : TRACK[absOf(color, pos)];
  return [r + 0.5, c + 0.5];
};

const freshTokens = () => ({ red: [-1, -1, -1, -1], green: [-1, -1, -1, -1], yellow: [-1, -1, -1, -1], blue: [-1, -1, -1, -1] });

// Simple computer player: finish > capture > leave base > reach safety > advance furthest.
const chooseMove = (state, color, d) => {
  let best = state.movable[0];
  let bestScore = -Infinity;
  state.movable.forEach((i) => {
    const pos = state.tokens[color][i];
    const to = pos === -1 ? 0 : pos + d;
    let score = to;
    if (to === LAST) score += 120;
    if (pos === -1) score += 70;
    if (to >= 51 && pos < 51) score += 40;
    if (to <= 50) {
      const abs = absOf(color, to);
      if (SAFE.includes(abs)) score += 25;
      else {
        const hit = state.players.some((p) => p.color !== color &&
          state.tokens[p.color].some((q) => q >= 0 && q <= 50 && absOf(p.color, q) === abs));
        if (hit) score += 90;
      }
    }
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
};

/* ---------------- UI pieces ---------------- */
const CORNER = { red: 'tl', green: 'tr', yellow: 'br', blue: 'bl' };

const Dice = ({ value, rolling, onClick, active, color, size = 64 }) => (
  <button type="button" onClick={onClick} disabled={!active}
    className={`dice3d grid grid-cols-3 grid-rows-3 ${rolling ? 'dice-roll' : ''} ${active ? 'dice-ready cursor-pointer' : ''}`}
    style={{ width: size, height: size, padding: size * 0.15, '--ring': color }}
    aria-label={active ? 'Roll the dice' : `Dice shows ${value || 'nothing'}`}>
    {Array.from({ length: 9 }).map((_, k) => (
      <span key={k} className="grid place-items-center">
        {value && PIPS[value].includes(k) && (
          <span className="rounded-full" style={{ width: size * 0.16, height: size * 0.16, background: value === 1 ? '#d42a2a' : '#1b1b1b', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.6)' }} />
        )}
      </span>
    ))}
  </button>
);

const Pawn = ({ color, id }) => (
  <svg viewBox="0 0 40 54" className="w-full h-full overflow-visible" aria-hidden="true">
    <defs>
      <radialGradient id={`pg-${id}`} cx="35%" cy="28%" r="75%">
        <stop offset="0" stopColor="#fff" stopOpacity=".85" />
        <stop offset=".3" stopColor={META[color].hex} />
        <stop offset="1" stopColor={META[color].dark} />
      </radialGradient>
    </defs>
    <ellipse cx="20" cy="50" rx="12" ry="3.2" fill="rgba(0,0,0,.22)" />
    <path d="M20 3.5a9 9 0 0 1 5.4 16.2C29 26 31 33 32.5 41H7.5C9 33 11 26 14.6 19.7A9 9 0 0 1 20 3.5z"
      fill={`url(#pg-${id})`} stroke="#fff" strokeWidth="2.2" />
    <ellipse cx="20" cy="42" rx="13.5" ry="5.2" fill={META[color].dark} stroke="#fff" strokeWidth="2.2" />
    <ellipse cx="16.5" cy="9.5" rx="3" ry="2.2" fill="#fff" opacity=".75" />
  </svg>
);

const PlayerPanel = ({ p, g, active, children }) => {
  const home = g.tokens[p.color].filter((q) => q === LAST).length;
  const corner = CORNER[p.color];
  const right = corner === 'tr' || corner === 'br';
  return (
    <div className={`flex items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <div className={`player-chip ${active ? 'on' : ''}`} style={{ '--c': META[p.color].hex }}>
        <span className="text-[14px] leading-none">{p.label === 'You' ? 'YOU' : p.label.replace('Player ', 'P').replace('CPU ', 'C')}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: '#fff', opacity: active ? 1 : 0.7 }}>{p.label}</p>
        <div className={`flex gap-1 mt-1 ${right ? 'justify-end' : ''}`}>
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="w-2 h-2 rounded-full" style={{ background: k < home ? '#ffd84d' : 'rgba(255,255,255,.25)' }} />
          ))}
        </div>
      </div>
      <div className="w-[58px] h-[58px] grid place-items-center shrink-0">{children}</div>
    </div>
  );
};

const Setup = ({ onStart }) => {
  const [mode, setMode] = useState('cpu');
  const [count, setCount] = useState(2);
  const colorsFor = (n) => (n === 2 ? ['red', 'yellow'] : n === 3 ? ['red', 'green', 'yellow'] : COLORS);

  const start = () => {
    onStart(colorsFor(count).map((color, k) => ({
      color,
      ai: mode === 'cpu' && k > 0,
      label: mode === 'cpu' ? (k === 0 ? 'You' : `CPU ${k}`) : `Player ${k + 1}`,
    })));
  };

  const Card = ({ id, icon, title, sub }) => (
    <button type="button" onClick={() => setMode(id)}
      className={`ludo-card text-left p-4 press ${mode === id ? 'on' : ''}`}>
      <span className="block font-mono text-[11px] tracking-widest sub">{icon}</span>
      <span className="block font-black text-[17px] mt-1">{title}</span>
      <span className="block text-[12px] sub mt-0.5">{sub}</span>
    </button>
  );

  return (
    <div className="ludo-bg min-h-[calc(100vh-56px)] -mb-[92px] pb-[110px]">
      <div className="max-w-md mx-auto px-5 pt-8 pb-10">
        <div className="ludo-logo mx-auto" aria-hidden="true"><i /><i /><i /><i /></div>
        <h1 className="text-center text-[58px] mt-4 rise ludo-title">LUDO</h1>
        <p className="text-center font-mono text-[11px] tracking-[0.3em] text-white/80">ROLL · RACE · CAPTURE</p>

        <p className="font-mono text-[11px] tracking-[0.2em] text-white/70 mt-8 mb-2">CHOOSE MODE</p>
        <div className="grid grid-cols-2 gap-3">
          <Card id="cpu" icon="MODE 01" title="Vs Computer" sub="Play solo against bots" />
          <Card id="pass" icon="MODE 02" title="Pass & Play" sub="Friends on one phone" />
        </div>

        <p className="font-mono text-[11px] tracking-[0.2em] text-white/70 mt-6 mb-2">PLAYERS</p>
        <div className="grid grid-cols-3 gap-3">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setCount(n)} className={`ludo-card py-3 press ${count === n ? 'on' : ''}`}>
              <span className="block font-black text-[22px]">{n}</span>
              <span className="flex justify-center gap-1 mt-1">
                {colorsFor(n).map((c) => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: META[c].hex }} />)}
              </span>
            </button>
          ))}
        </div>

        <button onClick={start} className="ludo-start w-full h-14 mt-8 text-black font-black text-[18px] tracking-wider press">
          ▶ START GAME
        </button>

        <details className="mt-8 text-[13px] ludo-card p-4 text-white">
          <summary className="cursor-pointer font-semibold">How to play</summary>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li>Roll a 6 to bring a token out of base.</li>
            <li>A 6, a capture or reaching home gives another roll. Three 6s in a row lose the turn.</li>
            <li>Land on an opponent to send it home — except on ★ squares and start squares.</li>
            <li>Exact roll needed to finish. First to bring all 4 home wins.</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

/* ---------------- game ---------------- */
const Ludo = () => {
  const [g, setG] = useState({ status: 'setup' });
  const ref = useRef(g);
  const [muted, setMutedState] = useState(isMuted());
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); if (muted) play('turn'); };
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const commit = (patch) => {
    ref.current = { ...ref.current, ...patch };
    if (alive.current) setG(ref.current);
  };

  const startGame = (players) => {
    ref.current = {
      status: 'playing', players, tokens: freshTokens(), turn: 0, dice: null, rolling: false,
      phase: 'roll', sixes: 0, movable: [], winners: [], msg: '',
    };
    setG(ref.current);
  };

  const nextTurn = () => {
    const s = ref.current;
    let t = s.turn;
    do { t = (t + 1) % s.players.length; } while (s.winners.includes(s.players[t].color));
    commit({ turn: t, phase: 'roll', sixes: 0, movable: [], msg: '' });
  };

  const roll = async () => {
    const s = ref.current;
    if (s.status !== 'playing' || s.phase !== 'roll') return;
    commit({ phase: 'busy', rolling: true, msg: '' });
    if (navigator.vibrate) navigator.vibrate(25);
    play('roll');
    for (let k = 0; k < 7; k += 1) {
      commit({ dice: 1 + Math.floor(Math.random() * 6) });
      await sleep(65); // eslint-disable-line no-await-in-loop
    }
    const d = 1 + Math.floor(Math.random() * 6);
    const color = s.players[s.turn].color;
    const sixes = d === 6 ? s.sixes + 1 : 0;
    commit({ dice: d, rolling: false, sixes });
    play('dice');

    if (sixes === 3) {
      commit({ msg: 'Three sixes — turn lost' });
      await sleep(1000);
      return nextTurn();
    }
    const movable = ref.current.tokens[color].map((p, i) => (canMove(p, d) ? i : -1)).filter((i) => i >= 0);
    if (!movable.length) {
      commit({ msg: d === 6 ? 'No move possible' : 'No move — need a 6' });
      play('nomove');
      await sleep(850);
      return nextTurn();
    }
    commit({ phase: 'move', movable });
    return undefined;
  };

  const setPos = (color, i, pos) => {
    const arr = [...ref.current.tokens[color]];
    arr[i] = pos;
    commit({ tokens: { ...ref.current.tokens, [color]: arr } });
  };

  const moveToken = async (i) => {
    const s = ref.current;
    if (s.phase !== 'move' || !s.movable.includes(i)) return;
    const { color } = s.players[s.turn];
    const d = s.dice;
    const from = s.tokens[color][i];
    commit({ phase: 'busy', movable: [] });

    if (from === -1) {
      play('out');
      setPos(color, i, 0);
      await sleep(220);
    } else {
      for (let k = 1; k <= d; k += 1) {
        setPos(color, i, from + k);
        play('step', k);
        await sleep(150); // eslint-disable-line no-await-in-loop
      }
    }
    const to = from === -1 ? 0 : from + d;

    // capture
    let captured = false;
    if (to <= 50 && !SAFE.includes(absOf(color, to))) {
      const abs = absOf(color, to);
      const tokens = { ...ref.current.tokens };
      s.players.forEach((p) => {
        if (p.color === color) return;
        tokens[p.color] = tokens[p.color].map((q) => {
          if (q >= 0 && q <= 50 && absOf(p.color, q) === abs) { captured = true; return -1; }
          return q;
        });
      });
      if (captured) {
        if (navigator.vibrate) navigator.vibrate([40, 40, 60]);
        play('capture');
        commit({ tokens });
      }
    }

    // finished?
    if (to === LAST) play('home');
    let { winners } = ref.current;
    if (ref.current.tokens[color].every((q) => q === LAST)) winners = [...winners, color];
    const left = s.players.filter((p) => !winners.includes(p.color));
    if (left.length <= 1) {
      commit({ winners: [...winners, ...left.map((p) => p.color)], status: 'over', phase: 'done' });
      play('win');
      return;
    }
    commit({ winners });

    const done = winners.includes(color);
    if (!done && (d === 6 || captured || to === LAST)) {
      commit({ phase: 'roll', msg: captured ? 'Captured! Roll again' : to === LAST ? 'Home! Roll again' : 'Six! Roll again' });
    } else {
      nextTurn();
    }
  };

  // computer turns + auto-move when there's only one sensible choice
  useEffect(() => {
    if (g.status !== 'playing') return undefined;
    const p = g.players[g.turn];
    let t;
    if (!p.ai && g.phase === 'roll') play('turn');
    if (p.ai && g.phase === 'roll') t = setTimeout(roll, 700);
    else if (g.phase === 'move') {
      const positions = g.movable.map((i) => g.tokens[p.color][i]);
      const oneChoice = g.movable.length === 1 || positions.every((q) => q === -1);
      if (p.ai) t = setTimeout(() => moveToken(chooseMove(ref.current, p.color, ref.current.dice)), 500);
      else if (oneChoice) t = setTimeout(() => moveToken(g.movable[0]), 380);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.status, g.turn, g.phase, g.movable]);

  if (g.status === 'setup') return <Setup onStart={startGame} />;

  const cur = g.players[g.turn];
  const curHex = META[cur.color].hex;
  const human = !cur.ai;

  // token layout (stack tokens that share a square)
  const placed = [];
  g.players.forEach(({ color }) => g.tokens[color].forEach((pos, i) => {
    const [y, x] = centerOf(color, pos, i);
    placed.push({ color, i, pos, y, x });
  }));
  const groups = {};
  placed.forEach((t) => { if (t.pos !== -1) (groups[`${t.y},${t.x}`] ||= []).push(t); });
  Object.values(groups).forEach((arr) => {
    if (arr.length < 2) return;
    arr.forEach((t, k) => { t.x += (k - (arr.length - 1) / 2) * 0.3; t.small = true; });
  });

  const cell = 100 / 15;
  const cells = [];
  TRACK.forEach(([r, c], idx) => {
    const startColor = COLORS.find((col) => META[col].start === idx);
    cells.push({ r, c, color: startColor, star: SAFE.includes(idx) && !startColor, start: !!startColor });
  });
  Object.entries(HOME).forEach(([col, arr]) => arr.forEach(([r, c]) => cells.push({ r, c, color: col, lane: true })));

  const byCorner = (corner) => g.players.find((p) => CORNER[p.color] === corner);
  const panel = (corner) => {
    const p = byCorner(corner);
    if (!p) return <div />;
    const active = p.color === cur.color && g.status === 'playing';
    return (
      <PlayerPanel p={p} g={g} active={active}>
        {active ? (
          <Dice value={g.dice} rolling={g.rolling} color={META[p.color].hex} size={54}
            active={human && g.phase === 'roll' && g.status === 'playing'} onClick={roll} />
        ) : null}
      </PlayerPanel>
    );
  };

  const status = g.msg || (cur.ai ? `${cur.label} is thinking…` : g.phase === 'roll' ? `${cur.label === 'You' ? 'Your' : `${cur.label}'s`} turn — tap the dice` : g.phase === 'move' ? 'Tap a glowing token' : '');

  return (
    <div className="ludo-bg min-h-[calc(100vh-56px)] -mb-[92px] pb-[110px] pb-6">
      {/* top bar */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button onClick={() => { if (window.confirm('Quit this game?')) setG((ref.current = { status: 'setup' })); }}
          className="ludo-icon-btn press" aria-label="Quit">✕</button>
        <p className="ludo-pill">{g.players.some((x) => x.ai) ? 'VS COMPUTER' : 'PASS & PLAY'} · {g.players.length}P</p>
        <button onClick={toggleMute} className="ludo-icon-btn press text-[17px]" aria-label={muted ? 'Sound on' : 'Mute'}>
          {muted ? <FiVolumeX /> : <FiVolume2 />}
        </button>
      </div>

      <div className="mx-auto px-3 mt-3" style={{ width: 'min(100%, 560px)' }}>
        <div className="grid grid-cols-2 gap-2 mb-2">{panel('tl')}{panel('tr')}</div>

        {/* board */}
        <div className="ludo-frame">
          <div className="relative w-full aspect-square ludo-board select-none overflow-hidden">
            {COLORS.map((col) => {
              const [r, c] = BASE_ORIGIN[col];
              const active = cur.color === col && g.status === 'playing';
              return (
                <div key={col} className={`absolute ludo-base ${active ? 'on' : ''}`}
                  style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${6 * cell}%`, height: `${6 * cell}%`, '--c': META[col].hex, '--d': META[col].dark }}>
                  <div className="ludo-yard" />
                  {BASE[col].map(([y, x], k) => (
                    <span key={k} className="ludo-slot"
                      style={{ top: `${((y - r) / 6) * 100}%`, left: `${((x - c) / 6) * 100}%`, '--c': META[col].hex }} />
                  ))}
                </div>
              );
            })}

            {cells.map(({ r, c, color, star, start, lane }) => (
              <div key={`${r}-${c}`} className={`absolute ludo-cell ${color ? 'tint' : ''}`}
                style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${cell}%`, height: `${cell}%`, '--c': color ? META[color].hex : undefined, '--d': color ? META[color].dark : undefined }}>
                {(star || start) && <span className={start ? 'text-white' : 'text-[#b9bfdc]'} style={{ fontSize: 'min(3.2vw, 17px)' }}>{start ? '➤' : '★'}</span>}
                {lane && null}
              </div>
            ))}

            <div className="absolute ludo-center" style={{ top: `${6 * cell}%`, left: `${6 * cell}%`, width: `${3 * cell}%`, height: `${3 * cell}%`,
              background: `conic-gradient(from -45deg, ${META.green.hex} 0 90deg, ${META.yellow.hex} 90deg 180deg, ${META.blue.hex} 180deg 270deg, ${META.red.hex} 270deg 360deg)` }}>
              <span className="text-white drop-shadow" style={{ fontSize: 'min(6vw, 30px)' }}>★</span>
            </div>

            {placed.map((t) => {
              const movable = g.phase === 'move' && t.color === cur.color && g.movable.includes(t.i) && human;
              const w = cell * (t.small ? 0.7 : 0.92);
              return (
                <button key={`${t.color}${t.i}`} type="button" onClick={() => movable && moveToken(t.i)} disabled={!movable}
                  className={`pawn absolute ${movable ? 'pawn-movable' : ''}`}
                  style={{ left: `${(t.x / 15) * 100}%`, top: `${(t.y / 15) * 100}%`, width: `${w}%`, height: `${w * 1.35}%`,
                    '--c': META[t.color].hex, zIndex: movable ? 40 : 10 + Math.round(t.y * 2) }}
                  aria-label={`${META[t.color].name} token ${t.i + 1}`}>
                  <Pawn color={t.color} id={`${t.color}${t.i}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">{panel('bl')}{panel('br')}</div>

        <div className="ludo-status mt-3" style={{ '--c': curHex }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: curHex }} />
          <span className="truncate">{status}</span>
        </div>
      </div>

      {/* result */}
      {g.status === 'over' && (
        <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-6">
          <div className="w-full max-w-sm bg-white text-[#1d2386] rounded-3xl p-6 text-center rise" style={{ boxShadow: '0 8px 0 #1d2386' }}>
            <p className="font-mono text-[12px] tracking-[0.3em] text-muted">GAME OVER</p>
            <h2 className="text-[38px] mt-2 font-black" style={{ color: META[g.winners[0]].hex }}>
              {g.players.find((p) => p.color === g.winners[0]).label === 'You' ? 'You win!' : `${g.players.find((p) => p.color === g.winners[0]).label} wins!`}
            </h2>
            <ol className="mt-4 text-left">
              {g.winners.map((col, k) => (
                <li key={col} className="flex items-center gap-3 py-2 border-b border-line">
                  <span className="num w-5 font-bold">{k + 1}</span>
                  <span className="w-3 h-3 rounded-full" style={{ background: META[col].hex }} />
                  <span className="font-semibold">{g.players.find((p) => p.color === col).label}</span>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={() => startGame(g.players)} className="ludo-start h-11 text-black font-bold press">Play again</button>
              <button onClick={() => setG((ref.current = { status: 'setup' }))} className="h-11 rounded-2xl border-2 border-[#1d2386] font-bold press">Change mode</button>
            </div>
            <Link to="/" className="block mt-4 text-[12px] text-muted underline">Back to home</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ludo;
