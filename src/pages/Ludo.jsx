import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ---------------- board geometry (15 × 15 grid) ---------------- */
const COLORS = ['red', 'green', 'yellow', 'blue']; // clockwise turn order
const META = {
  red: { name: 'Red', hex: '#e23b3b', soft: '#fde3e3', start: 0 },
  green: { name: 'Green', hex: '#1fa45a', soft: '#ddf5e7', start: 13 },
  yellow: { name: 'Yellow', hex: '#f5b301', soft: '#fff3cf', start: 26 },
  blue: { name: 'Blue', hex: '#2f6fe4', soft: '#e0eafc', start: 39 },
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
const Dice = ({ value, rolling, onClick, active, color }) => (
  <button type="button" onClick={onClick} disabled={!active}
    className={`relative w-[72px] h-[72px] bg-white grid grid-cols-3 grid-rows-3 p-2.5 gap-0.5 border-4 transition-transform ${
      rolling ? 'dice-roll' : ''} ${active ? 'dice-ready cursor-pointer' : 'opacity-80'}`}
    style={{ borderColor: color, borderRadius: 14 }}
    aria-label={active ? 'Roll the dice' : `Dice shows ${value || 'nothing'}`}>
    {Array.from({ length: 9 }).map((_, k) => (
      <span key={k} className="grid place-items-center">
        {value && PIPS[value].includes(k) && <span className="w-[11px] h-[11px] rounded-full bg-[#141414]" />}
      </span>
    ))}
  </button>
);

const Setup = ({ onStart }) => {
  const [mode, setMode] = useState('cpu');
  const [count, setCount] = useState(2);
  const opt = (on) => `h-12 border-2 font-bold text-[15px] press ${on ? 'bg-[#f5b301] border-[#f5b301] text-black' : 'border-white/30 text-white'}`;

  const start = () => {
    const colors = count === 2 ? ['red', 'yellow'] : count === 3 ? ['red', 'green', 'yellow'] : COLORS;
    onStart(colors.map((color, k) => ({
      color,
      ai: mode === 'cpu' && k > 0,
      label: mode === 'cpu' ? (k === 0 ? 'You' : 'CPU') : `P${k + 1}`,
    })));
  };

  return (
    <div className="relative min-h-[calc(100vh-150px)] bg-black text-white overflow-hidden">
      <img src="/auth-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="relative max-w-md mx-auto px-5 pt-8 pb-10">
        <div className="ludo-mini !w-20 !h-20 mx-auto" aria-hidden="true"><i /><i /><i /><i /></div>
        <h1 className="text-center text-[56px] mt-4 rise">LUDO</h1>
        <p className="text-center font-mono text-[11px] tracking-[0.25em] text-[#f5b301]">ROLL · RACE · CAPTURE</p>

        <p className="font-mono text-[11px] tracking-[0.2em] text-white/60 mt-8 mb-2">MODE</p>
        <div className="grid grid-cols-2 gap-2">
          <button className={opt(mode === 'cpu')} onClick={() => setMode('cpu')}>Vs Computer</button>
          <button className={opt(mode === 'pass')} onClick={() => setMode('pass')}>Pass &amp; Play</button>
        </div>

        <p className="font-mono text-[11px] tracking-[0.2em] text-white/60 mt-6 mb-2">PLAYERS</p>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => <button key={n} className={opt(count === n)} onClick={() => setCount(n)}>{n}</button>)}
        </div>
        <p className="text-[13px] text-white/60 mt-3">
          {mode === 'cpu' ? `You (Red) vs ${count - 1} computer player${count > 2 ? 's' : ''}.` : `${count} players take turns on this phone.`}
        </p>

        <button onClick={start} className="play-btn w-full h-14 mt-8 text-black font-black text-[18px] tracking-wider press" style={{ borderRadius: 0 }}>
          START GAME
        </button>

        <details className="mt-8 text-[13px] text-white/75">
          <summary className="cursor-pointer font-semibold text-white">How to play</summary>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li>Roll a 6 to bring a token out of base.</li>
            <li>A 6, capturing a token, or reaching home gives another roll. Three 6s in a row lose the turn.</li>
            <li>Land on an opponent to send it back to base — except on ★ and start squares.</li>
            <li>You need the exact number to reach home. First to bring all 4 tokens home wins.</li>
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
    for (let k = 0; k < 7; k += 1) {
      commit({ dice: 1 + Math.floor(Math.random() * 6) });
      await sleep(65); // eslint-disable-line no-await-in-loop
    }
    const d = 1 + Math.floor(Math.random() * 6);
    const color = s.players[s.turn].color;
    const sixes = d === 6 ? s.sixes + 1 : 0;
    commit({ dice: d, rolling: false, sixes });

    if (sixes === 3) {
      commit({ msg: 'Three sixes — turn lost' });
      await sleep(1000);
      return nextTurn();
    }
    const movable = ref.current.tokens[color].map((p, i) => (canMove(p, d) ? i : -1)).filter((i) => i >= 0);
    if (!movable.length) {
      commit({ msg: d === 6 ? 'No move possible' : 'No move — need a 6' });
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
      setPos(color, i, 0);
      await sleep(220);
    } else {
      for (let k = 1; k <= d; k += 1) {
        setPos(color, i, from + k);
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
        commit({ tokens });
      }
    }

    // finished?
    let { winners } = ref.current;
    if (ref.current.tokens[color].every((q) => q === LAST)) winners = [...winners, color];
    const left = s.players.filter((p) => !winners.includes(p.color));
    if (left.length <= 1) {
      commit({ winners: [...winners, ...left.map((p) => p.color)], status: 'over', phase: 'done' });
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
    cells.push({ r, c, bg: startColor ? META[startColor].hex : '#fff', star: SAFE.includes(idx) && !startColor, arrow: !!startColor });
  });
  Object.entries(HOME).forEach(([col, arr]) => arr.forEach(([r, c]) => cells.push({ r, c, bg: META[col].hex })));

  return (
    <div className="bg-[#111] min-h-[calc(100vh-150px)] text-white pb-6">
      {/* players */}
      <div className="grid gap-1.5 px-3 pt-3" style={{ gridTemplateColumns: `repeat(${g.players.length}, 1fr)` }}>
        {g.players.map((p, k) => {
          const home = g.tokens[p.color].filter((q) => q === LAST).length;
          const on = k === g.turn && g.status === 'playing';
          return (
            <div key={p.color} className={`px-2 py-1.5 border-2 transition-all ${on ? 'scale-[1.03]' : 'opacity-60'}`}
              style={{ borderColor: on ? META[p.color].hex : '#333', background: on ? `${META[p.color].hex}22` : 'transparent' }}>
              <p className="text-[12px] font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: META[p.color].hex }} />{p.label}
              </p>
              <p className="font-mono text-[10px] text-white/60">{home}/4 home</p>
            </div>
          );
        })}
      </div>

      {/* board */}
      <div className="mx-auto mt-3 px-3" style={{ width: 'min(100%, 560px)' }}>
        <div className="relative w-full aspect-square bg-white border-4 border-black select-none" style={{ boxShadow: '0 0 0 2px #f5b301, 0 12px 40px rgba(0,0,0,.5)' }}>
          {COLORS.map((col) => {
            const [r, c] = BASE_ORIGIN[col];
            const active = cur.color === col && g.status === 'playing';
            return (
              <div key={col} className={`absolute ${active ? 'base-glow' : ''}`}
                style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${6 * cell}%`, height: `${6 * cell}%`, background: META[col].hex, '--glow': META[col].hex }}>
                <div className="absolute bg-white" style={{ inset: '14%', borderRadius: 10 }} />
                {BASE[col].map(([y, x], k) => (
                  <span key={k} className="absolute rounded-full border-2"
                    style={{ width: `${0.95 / 6 * 100}%`, height: `${0.95 / 6 * 100}%`, top: `${((y - r) / 6) * 100}%`, left: `${((x - c) / 6) * 100}%`,
                      transform: 'translate(-50%,-50%)', background: META[col].soft, borderColor: META[col].hex }} />
                ))}
              </div>
            );
          })}

          {cells.map(({ r, c, bg, star, arrow }) => (
            <div key={`${r}-${c}`} className="absolute border border-[#1a1a1a]/25 grid place-items-center"
              style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${cell}%`, height: `${cell}%`, background: bg }}>
              {star && <span className="text-[#9a968e] leading-none" style={{ fontSize: 'min(3.2vw, 18px)' }}>★</span>}
              {arrow && <span className="text-white/90 leading-none" style={{ fontSize: 'min(3vw, 16px)' }}>★</span>}
            </div>
          ))}

          <div className="absolute" style={{ top: `${6 * cell}%`, left: `${6 * cell}%`, width: `${3 * cell}%`, height: `${3 * cell}%`,
            background: `conic-gradient(from -45deg, ${META.green.hex} 0 90deg, ${META.yellow.hex} 90deg 180deg, ${META.blue.hex} 180deg 270deg, ${META.red.hex} 270deg 360deg)` }}>
            <div className="absolute inset-[30%] bg-black/80 grid place-items-center rotate-45"><span className="-rotate-45 text-[#f5b301]" style={{ fontSize: 'min(3.4vw,18px)' }}>♛</span></div>
          </div>

          {placed.map((t) => {
            const movable = g.phase === 'move' && t.color === cur.color && g.movable.includes(t.i) && human;
            return (
              <button key={`${t.color}${t.i}`} type="button" onClick={() => movable && moveToken(t.i)} disabled={!movable}
                className={`token absolute rounded-full ${movable ? 'token-movable' : ''}`}
                style={{ left: `${(t.x / 15) * 100}%`, top: `${(t.y / 15) * 100}%`, width: `${cell * (t.small ? 0.62 : 0.8)}%`, height: `${cell * (t.small ? 0.62 : 0.8)}%`,
                  '--c': META[t.color].hex, zIndex: movable ? 30 : 10 + Math.round(t.y) }}
                aria-label={`${META[t.color].name} token ${t.i + 1}`} />
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-5 mt-5 px-4">
        <div className="text-right flex-1">
          <p className="font-bold text-[16px]" style={{ color: curHex }}>{cur.ai ? `${cur.label} (${META[cur.color].name})` : cur.label === 'You' ? 'Your turn' : `${cur.label} — ${META[cur.color].name}`}</p>
          <p className="text-[12px] text-white/60 min-h-[18px]">
            {g.msg || (cur.ai ? 'Thinking…' : g.phase === 'roll' ? 'Tap the dice' : g.phase === 'move' ? 'Tap a glowing token' : '')}
          </p>
        </div>
        <Dice value={g.dice} rolling={g.rolling} color={curHex} active={human && g.phase === 'roll' && g.status === 'playing'} onClick={roll} />
        <div className="flex-1">
          <button onClick={() => { if (window.confirm('Quit this game?')) setG((ref.current = { status: 'setup' })); }}
            className="text-[12px] font-semibold text-white/60 underline underline-offset-2">Quit</button>
        </div>
      </div>

      {/* result */}
      {g.status === 'over' && (
        <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-6">
          <div className="w-full max-w-sm bg-black border-2 border-[#f5b301] p-6 text-center rise" style={{ boxShadow: '0 0 40px rgba(245,179,1,.35)' }}>
            <p className="text-[44px] leading-none">🏆</p>
            <h2 className="text-[34px] mt-2" style={{ color: META[g.winners[0]].hex }}>
              {g.players.find((p) => p.color === g.winners[0]).label === 'You' ? 'You win!' : `${g.players.find((p) => p.color === g.winners[0]).label} wins!`}
            </h2>
            <ol className="mt-4 text-left border-t border-white/15">
              {g.winners.map((col, k) => (
                <li key={col} className="flex items-center gap-3 py-2 border-b border-white/15">
                  <span className="num text-[#f5b301] w-5">{k + 1}</span>
                  <span className="w-3 h-3 rounded-full" style={{ background: META[col].hex }} />
                  <span className="font-semibold">{g.players.find((p) => p.color === col).label}</span>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={() => startGame(g.players)} className="h-11 bg-[#f5b301] text-black font-bold press">Play again</button>
              <button onClick={() => setG((ref.current = { status: 'setup' }))} className="h-11 border border-white/40 font-bold press">Change mode</button>
            </div>
            <Link to="/" className="block mt-4 text-[12px] text-white/60 underline">Back to home</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ludo;
