import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';
import { play, isMuted, setMuted } from '../lib/sound';
import { showInterstitial } from '../lib/ads';

/* ---------------- board geometry (15 × 15 grid) ---------------- */
const COLORS = ['red', 'green', 'yellow', 'blue']; // clockwise turn order
// Printed-board inks, a little dusty rather than neon.
const META = {
  red: { name: 'Red', hex: '#cf3b2b', dark: '#7e1c13', start: 0 },
  green: { name: 'Green', hex: '#2f8a4c', dark: '#164f29', start: 13 },
  yellow: { name: 'Yellow', hex: '#e9a719', dark: '#8c5d00', start: 26 },
  blue: { name: 'Blue', hex: '#2c5fa8', dark: '#132f5c', start: 39 },
};
const INK = '#121212';

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
// direction of travel out of each start square (degrees, 0 = pointing right)
const START_ARROW = { red: 0, green: 90, yellow: 180, blue: 270 };

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

const Dice = ({ value, rolling, onClick, active, color, size = 52 }) => (
  <button type="button" onClick={onClick} disabled={!active}
    className={`ld-dice grid grid-cols-3 grid-rows-3 ${rolling ? 'dice-roll' : ''} ${active ? 'ready' : ''}`}
    style={{ width: size, height: size, padding: size * 0.14, '--ring': color }}
    aria-label={active ? 'Roll the dice' : `Dice shows ${value || 'nothing'}`}>
    {Array.from({ length: 9 }).map((_, k) => (
      <span key={k} className="grid place-items-center">
        {value && PIPS[value].includes(k) && (
          <span className="rounded-full" style={{ width: size * 0.17, height: size * 0.17, background: value === 1 ? META.red.hex : INK }} />
        )}
      </span>
    ))}
  </button>
);

// Flat, ink-outlined piece — like a printed cardboard / painted wooden pawn.
const Pawn = ({ color }) => (
  <svg viewBox="0 0 40 54" className="w-full h-full overflow-visible" aria-hidden="true">
    <ellipse cx="21.5" cy="50" rx="13" ry="3.4" fill="rgba(18,18,18,.22)" />
    <path d="M20 3.5a9 9 0 0 1 5.4 16.2C29 26 31 33 32.5 41H7.5C9 33 11 26 14.6 19.7A9 9 0 0 1 20 3.5z"
      fill={META[color].hex} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <ellipse cx="20" cy="42" rx="13.5" ry="5.2" fill={META[color].dark} stroke={INK} strokeWidth="2.4" />
    <path d="M15.5 9.5a5 5 0 0 1 4-3" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Star = () => (
  <svg viewBox="0 0 24 24" className="w-[64%] h-[64%]" aria-hidden="true">
    <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
      fill="none" stroke={INK} strokeOpacity=".55" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const Arrow = ({ deg }) => (
  <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
    <path d="M4 12h14M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlayerPanel = ({ p, g, active, children }) => {
  const home = g.tokens[p.color].filter((q) => q === LAST).length;
  const right = CORNER[p.color] === 'tr' || CORNER[p.color] === 'br';
  const done = g.winners.includes(p.color);
  return (
    <div className={`ld-player ${active ? 'on' : ''} ${right ? 'flex-row-reverse text-right' : ''}`} style={{ '--c': META[p.color].hex }}>
      <span className="ld-swatch" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold leading-tight truncate">{p.label}</p>
        <p className="num text-[11px] text-muted mt-0.5">{done ? 'finished' : `${home}/4 home`}</p>
      </div>
      <div className="w-[52px] h-[52px] grid place-items-center shrink-0">{children}</div>
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

  const Option = ({ id, title, sub }) => (
    <button type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
      className={`w-full flex items-center gap-4 text-left px-4 py-3.5 border border-ink -mt-px first:mt-0 transition-colors ${mode === id ? 'bg-white' : 'bg-transparent'}`}>
      <span className={`w-[18px] h-[18px] rounded-full border-2 border-ink grid place-items-center shrink-0`}>
        {mode === id && <span className="w-2 h-2 rounded-full bg-ink" />}
      </span>
      <span className="flex-1">
        <span className="block font-bold text-[16px]">{title}</span>
        <span className="block text-[13px] text-muted">{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="bg-canvas min-h-[calc(100vh-56px)] -mb-[92px] pb-[110px]">
      <div className="max-w-md mx-auto px-4 pt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Board game · works offline</p>
            <h1 className="text-[76px] leading-[.86] mt-2">Ludo</h1>
          </div>
          <MiniBoard />
        </div>
        <p className="text-[15px] text-[#3a3833] mt-4 max-w-[30ch]">Four pieces each. Get all of yours home before anyone else does.</p>

        <p className="field-label mt-8">Opponents</p>
        <div>
          <Option id="cpu" title="Computer" sub="Play on your own against bots" />
          <Option id="pass" title="Friends, same phone" sub="Pass the phone around each turn" />
        </div>

        <p className="field-label mt-6">Players</p>
        <div className="flex border border-ink">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setCount(n)}
              className={`flex-1 h-14 border-r border-ink last:border-r-0 flex flex-col items-center justify-center gap-1 ${count === n ? 'bg-ink text-white' : 'bg-white'}`}>
              <span className="num font-bold text-[17px] leading-none">{n}</span>
              <span className="flex gap-1">
                {colorsFor(n).map((c) => <span key={c} className="w-2 h-2" style={{ background: META[c].hex }} />)}
              </span>
            </button>
          ))}
        </div>

        <button onClick={start} className="btn btn-dark w-full h-14 mt-8 text-[16px] ld-shadow">Start game</button>

        <div className="mt-10 border-t border-ink pt-4 pb-4">
          <p className="eyebrow mb-3">House rules</p>
          <ol className="space-y-2 text-[14px] text-[#3a3833]">
            {[
              'You need a 6 to bring a piece out.',
              'Rolling a 6, knocking someone out or reaching home gives you another roll. Three 6s in a row and you lose the turn.',
              'Land on another player\'s piece to send it back to base. Not on star squares or start squares.',
              'You need the exact number to get home.',
            ].map((r, k) => (
              <li key={k} className="flex gap-3"><span className="num text-muted w-4 shrink-0">{k + 1}.</span><span>{r}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

// Small static drawing of the board for the setup screen.
const MiniBoard = () => (
  <svg viewBox="0 0 15 15" className="w-[84px] h-[84px] shrink-0 ld-shadow-sm bg-white border-2 border-ink" style={{ transform: 'rotate(4deg)' }} aria-hidden="true">
    {COLORS.map((c) => {
      const [r, col] = BASE_ORIGIN[c];
      return (
        <g key={c}>
          <rect x={col} y={r} width="6" height="6" fill={META[c].hex} />
          <rect x={col + 1} y={r + 1} width="4" height="4" fill="#fbf8f1" />
        </g>
      );
    })}
    <polygon points="6,6 9,6 7.5,7.5" fill={META.green.hex} />
    <polygon points="9,6 9,9 7.5,7.5" fill={META.yellow.hex} />
    <polygon points="9,9 6,9 7.5,7.5" fill={META.blue.hex} />
    <polygon points="6,9 6,6 7.5,7.5" fill={META.red.hex} />
    <path d="M6 0v15M9 0v15M0 6h15M0 9h15" stroke={INK} strokeWidth=".18" />
  </svg>
);

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
      commit({ msg: 'Three sixes. Turn lost.' });
      await sleep(1000);
      return nextTurn();
    }
    const movable = ref.current.tokens[color].map((p, i) => (canMove(p, d) ? i : -1)).filter((i) => i >= 0);
    if (!movable.length) {
      commit({ msg: d === 6 ? 'No move possible' : 'No move. Need a 6.' });
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
      commit({ phase: 'roll', msg: captured ? 'Knocked one out. Roll again.' : to === LAST ? 'Made it home. Roll again.' : 'Six. Roll again.' });
    } else {
      nextTurn();
    }
  };

  // ad break after the result card has been seen for a moment
  useEffect(() => {
    if (g.status !== 'over') return undefined;
    const t = setTimeout(showInterstitial, 2500);
    return () => clearTimeout(t);
  }, [g.status]);

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
    cells.push({ r, c, color: startColor, star: SAFE.includes(idx) && !startColor, start: startColor });
  });
  Object.entries(HOME).forEach(([col, arr]) => arr.forEach(([r, c]) => cells.push({ r, c, color: col })));

  const byCorner = (corner) => g.players.find((p) => CORNER[p.color] === corner);
  const panel = (corner) => {
    const p = byCorner(corner);
    if (!p) return <div />;
    const active = p.color === cur.color && g.status === 'playing';
    return (
      <PlayerPanel p={p} g={g} active={active}>
        {active ? (
          <Dice value={g.dice} rolling={g.rolling} color={META[p.color].hex} size={48}
            active={human && g.phase === 'roll' && g.status === 'playing'} onClick={roll} />
        ) : null}
      </PlayerPanel>
    );
  };

  const whose = cur.label === 'You' ? 'Your' : `${cur.label}'s`;
  const status = g.msg || (cur.ai ? `${cur.label} is playing…` : g.phase === 'roll' ? `${whose} turn. Tap the dice.` : g.phase === 'move' ? 'Pick a piece to move' : '');
  const winnerLabel = g.status === 'over' ? g.players.find((p) => p.color === g.winners[0]).label : '';

  return (
    <div className="bg-canvas min-h-[calc(100vh-56px)] -mb-[92px] pb-[110px]">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-ink bg-white">
        <button onClick={() => { if (window.confirm('Quit this game?')) setG((ref.current = { status: 'setup' })); }}
          className="text-[13px] font-semibold underline underline-offset-2">Quit</button>
        <p className="eyebrow !text-ink">{g.players.some((x) => x.ai) ? 'vs computer' : 'same phone'} · {g.players.length} players</p>
        <button onClick={toggleMute} className="w-9 h-9 -mr-2 grid place-items-center text-[18px]" aria-label={muted ? 'Sound on' : 'Mute'}>
          {muted ? <FiVolumeX /> : <FiVolume2 />}
        </button>
      </div>

      <div className="mx-auto px-3 pt-3" style={{ width: 'min(100%, 540px)' }}>
        <div className="grid grid-cols-2 gap-2 mb-3">{panel('tl')}{panel('tr')}</div>

        {/* board */}
        <div className="ld-board relative w-full aspect-square select-none overflow-hidden">
          {COLORS.map((col) => {
            const [r, c] = BASE_ORIGIN[col];
            const active = cur.color === col && g.status === 'playing';
            return (
              <div key={col} className={`absolute ld-base ${active ? 'on' : ''}`}
                style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${6 * cell}%`, height: `${6 * cell}%`, '--c': META[col].hex }}>
                <div className="ld-yard" />
                {BASE[col].map(([y, x], k) => (
                  <span key={k} className="ld-slot"
                    style={{ top: `${((y - r) / 6) * 100}%`, left: `${((x - c) / 6) * 100}%`, '--c': META[col].hex }} />
                ))}
              </div>
            );
          })}

          {cells.map(({ r, c, color, star, start }) => (
            <div key={`${r}-${c}`} className="absolute ld-cell"
              style={{ top: `${r * cell}%`, left: `${c * cell}%`, width: `${cell}%`, height: `${cell}%`, background: color ? META[color].hex : undefined }}>
              {star && <Star />}
              {start && <Arrow deg={START_ARROW[start]} />}
            </div>
          ))}

          <svg className="absolute" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true"
            style={{ top: `${6 * cell}%`, left: `${6 * cell}%`, width: `${3 * cell}%`, height: `${3 * cell}%` }}>
            <polygon points="0,0 3,0 1.5,1.5" fill={META.green.hex} />
            <polygon points="3,0 3,3 1.5,1.5" fill={META.yellow.hex} />
            <polygon points="3,3 0,3 1.5,1.5" fill={META.blue.hex} />
            <polygon points="0,3 0,0 1.5,1.5" fill={META.red.hex} />
            <path d="M0 0L3 3M3 0L0 3" stroke={INK} strokeWidth=".035" />
            <rect x="0" y="0" width="3" height="3" fill="none" stroke={INK} strokeWidth=".07" />
          </svg>

          {placed.map((t) => {
            const movable = g.phase === 'move' && t.color === cur.color && g.movable.includes(t.i) && human;
            const w = cell * (t.small ? 0.7 : 0.9);
            return (
              <button key={`${t.color}${t.i}`} type="button" onClick={() => movable && moveToken(t.i)} disabled={!movable}
                className={`ld-pawn absolute ${movable ? 'can' : ''}`}
                style={{ left: `${(t.x / 15) * 100}%`, top: `${(t.y / 15) * 100}%`, width: `${w}%`, height: `${w * 1.35}%`,
                  zIndex: movable ? 40 : 10 + Math.round(t.y * 2) }}
                aria-label={`${META[t.color].name} piece ${t.i + 1}${movable ? ', can move' : ''}`}>
                <Pawn color={t.color} />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">{panel('bl')}{panel('br')}</div>

        <div className="mt-3 flex items-center gap-3 bg-ink text-white px-4 h-11 text-[14px] font-semibold" aria-live="polite">
          <span className="w-3 h-3 shrink-0 border border-white" style={{ background: curHex }} />
          <span className="truncate">{status}</span>
        </div>
      </div>

      {/* result */}
      {g.status === 'over' && (
        <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-5">
          <div className="w-full max-w-sm bg-white border border-ink rise" style={{ boxShadow: `6px 6px 0 ${INK}` }}>
            <div className="h-2" style={{ background: META[g.winners[0]].hex }} />
            <div className="p-6">
              <p className="eyebrow">Game over</p>
              <h2 className="text-[44px] mt-1">{winnerLabel === 'You' ? 'You won.' : `${winnerLabel} won.`}</h2>
              <ol className="mt-5 border-t border-ink">
                {g.winners.map((col, k) => (
                  <li key={col} className="flex items-center gap-3 py-2.5 border-b border-line">
                    <span className="num w-5 text-muted">{k + 1}</span>
                    <span className="w-3 h-3 border border-ink" style={{ background: META[col].hex }} />
                    <span className="font-semibold flex-1">{g.players.find((p) => p.color === col).label}</span>
                    {k === 0 && <span className="tag border-ink">1st</span>}
                  </li>
                ))}
              </ol>
              <div className="grid grid-cols-2 gap-2 mt-6">
                <button onClick={() => startGame(g.players)} className="btn btn-dark">Play again</button>
                <button onClick={() => setG((ref.current = { status: 'setup' }))} className="btn btn-light">Change setup</button>
              </div>
              <Link to="/" className="block mt-4 text-[13px] text-muted underline text-center">Back to home</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ludo;
