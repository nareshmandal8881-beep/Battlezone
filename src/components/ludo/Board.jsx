import React, { useEffect, useRef, useState } from 'react';
import {
  COLORS, META, TRACK, HOME, BASE, BASE_ORIGIN, SAFE, START_ARROW, centerOf,
} from '../../lib/ludoEngine';
import { play } from '../../lib/sound';

const CELL = 100 / 15;
const STEP_MS = 140;

// Shown positions walk one square at a time towards the real positions,
// so moves animate the same way for local games and for moves that arrive from other phones.
export const useWalkingTokens = (tokens) => {
  const [shown, setShown] = useState(tokens);
  const target = useRef(tokens);
  target.current = tokens;

  useEffect(() => {
    if (!tokens) { setShown(tokens); return undefined; }
    const id = setInterval(() => {
      setShown((cur) => {
        if (!cur) return target.current;
        const t = target.current;
        let changed = false;
        let walking = false;
        const next = {};
        Object.keys(t).forEach((c) => {
          next[c] = (cur[c] || t[c]).map((p, i) => {
            const goal = t[c][i];
            if (p === goal) return p;
            if (goal >= 0 && p >= 0 && goal > p) { walking = true; changed = true; play('step', goal - p); return p + 1; }
            if (goal >= 0) { changed = true; return goal; } // leaving base / new game
            return p; // captured: handled below, after the attacker lands
          });
        });
        if (!walking) {
          Object.keys(t).forEach((c) => {
            next[c] = next[c].map((p, i) => {
              if (t[c][i] === -1 && p !== -1) { changed = true; return -1; }
              return p;
            });
          });
        }
        return changed ? next : cur;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [tokens]);

  const moving = !!(tokens && shown && Object.keys(tokens).some((c) => (shown[c] || []).some((p, i) => p !== tokens[c][i])));
  return [shown || tokens, moving];
};

const Pawn = ({ color }) => (
  <svg viewBox="0 0 40 54" className="w-full h-full overflow-visible" aria-hidden="true">
    <defs>
      <linearGradient id={`lp-${color}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={META[color].light} />
        <stop offset=".45" stopColor={META[color].hex} />
        <stop offset="1" stopColor={META[color].dark} />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="50.5" rx="12.5" ry="3.3" fill="rgba(0,0,0,.3)" />
    <path d="M20 4a8.6 8.6 0 0 1 5.2 15.5C28.8 25.6 30.8 32.6 32.2 40H7.8C9.2 32.6 11.2 25.6 14.8 19.5A8.6 8.6 0 0 1 20 4z"
      fill={`url(#lp-${color})`} stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
    <ellipse cx="20" cy="41.5" rx="13.6" ry="5.4" fill={META[color].dark} stroke="#fff" strokeWidth="2.6" />
    <ellipse cx="16.8" cy="10" rx="2.6" ry="1.8" fill="#fff" opacity=".8" />
  </svg>
);

const Star = () => (
  <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]" aria-hidden="true">
    <path d="M12 2.6l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 16.9l-5.6 2.9 1.1-6.2L3 9.2l6.2-.9z" fill="none" stroke="#9aa3b5" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const Arrow = ({ deg, color }) => (
  <svg viewBox="0 0 24 24" className="w-[64%] h-[64%]" style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
    <path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// cells that never change
const CELLS = [];
TRACK.forEach(([r, c], idx) => {
  const start = COLORS.find((col) => META[col].start === idx);
  CELLS.push({ r, c, start, star: SAFE.includes(idx) && !start });
});
Object.entries(HOME).forEach(([col, arr]) => arr.forEach(([r, c]) => CELLS.push({ r, c, lane: col })));

/**
 * players: [{color}] in the game; tokens: shown positions; active: color whose turn it is;
 * pickable: token indexes the viewer may tap now; onPick(i)
 */
const Board = ({ players, tokens, active, pickable = [], onPick }) => {
  const inGame = players.map((p) => p.color);

  const placed = [];
  inGame.forEach((color) => (tokens[color] || []).forEach((pos, i) => {
    const [y, x] = centerOf(color, pos, i);
    placed.push({ color, i, pos, y, x });
  }));
  const groups = {};
  placed.forEach((t) => { if (t.pos !== -1) (groups[`${t.y},${t.x}`] ||= []).push(t); });
  Object.values(groups).forEach((arr) => {
    if (arr.length < 2) return;
    arr.forEach((t, k) => { t.x += (k - (arr.length - 1) / 2) * 0.3; t.small = true; });
  });

  return (
    <div className="lb-board relative w-full aspect-square select-none">
      {COLORS.map((col) => {
        const [r, c] = BASE_ORIGIN[col];
        return (
          <div key={col} className={`absolute lb-base ${active === col ? 'on' : ''} ${inGame.includes(col) ? '' : 'off'}`}
            style={{ top: `${r * CELL}%`, left: `${c * CELL}%`, width: `${6 * CELL}%`, height: `${6 * CELL}%`, '--c': META[col].hex }}>
            <div className="lb-yard" />
            {BASE[col].map(([y, x], k) => (
              <span key={k} className="lb-slot" style={{ top: `${((y - r) / 6) * 100}%`, left: `${((x - c) / 6) * 100}%` }} />
            ))}
          </div>
        );
      })}

      {CELLS.map(({ r, c, start, star, lane }) => (
        <div key={`${r}-${c}`} className="absolute lb-cell"
          style={{ top: `${r * CELL}%`, left: `${c * CELL}%`, width: `${CELL}%`, height: `${CELL}%`, background: lane ? META[lane].hex : undefined }}>
          {star && <Star />}
          {start && <Arrow deg={START_ARROW[start]} color={META[start].hex} />}
        </div>
      ))}

      <svg className="absolute" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true"
        style={{ top: `${6 * CELL}%`, left: `${6 * CELL}%`, width: `${3 * CELL}%`, height: `${3 * CELL}%` }}>
        <polygon points="0,0 3,0 1.5,1.5" fill={META.green.hex} />
        <polygon points="3,0 3,3 1.5,1.5" fill={META.yellow.hex} />
        <polygon points="3,3 0,3 1.5,1.5" fill={META.blue.hex} />
        <polygon points="0,3 0,0 1.5,1.5" fill={META.red.hex} />
      </svg>

      {placed.map((t) => {
        const can = t.color === active && pickable.includes(t.i);
        const w = CELL * (t.small ? 0.72 : 0.94);
        return (
          <button key={`${t.color}${t.i}`} type="button" onClick={() => can && onPick?.(t.i)} disabled={!can}
            className={`lb-pawn absolute ${can ? 'can' : ''}`}
            style={{ left: `${(t.x / 15) * 100}%`, top: `${(t.y / 15) * 100}%`, width: `${w}%`, height: `${w * 1.35}%`, zIndex: can ? 40 : 10 + Math.round(t.y * 2) }}
            aria-label={`${META[t.color].name} piece ${t.i + 1}${can ? ', tap to move' : ''}`}>
            <Pawn color={t.color} />
          </button>
        );
      })}
    </div>
  );
};

export default Board;
