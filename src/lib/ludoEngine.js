// Pure Ludo rules — no React, no timers. Used by offline games and online rooms alike.
// State: { players:[{color,name,uid?,ai?,photo?}], tokens:{color:[4 positions]}, turn, dice, phase, sixes, movable, winners, msg, last, seq }
// Token position: -1 base, 0..50 main track, 51..55 home column, 56 finished.

export const COLORS = ['red', 'green', 'yellow', 'blue']; // clockwise turn order
export const META = {
  red: { name: 'Red', hex: '#e8322f', dark: '#9b1512', light: '#ff8a7a', start: 0 },
  green: { name: 'Green', hex: '#14a44d', dark: '#0a5f2b', light: '#6fe39b', start: 13 },
  yellow: { name: 'Yellow', hex: '#f7c51e', dark: '#a87b00', light: '#ffe48a', start: 26 },
  blue: { name: 'Blue', hex: '#1f8ce6', dark: '#0e4f8c', light: '#8cc8ff', start: 39 },
};

export const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];
export const HOME = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};
export const BASE = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  green: [[2, 11], [2, 13], [4, 11], [4, 13]],
  yellow: [[11, 11], [11, 13], [13, 11], [13, 13]],
  blue: [[11, 2], [11, 4], [13, 2], [13, 4]],
};
export const BASE_ORIGIN = { red: [0, 0], green: [0, 9], yellow: [9, 9], blue: [9, 0] };
export const FINISH = { red: [7.5, 6.55], green: [6.55, 7.5], yellow: [7.5, 8.45], blue: [8.45, 7.5] };
export const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
export const LAST = 56;
export const START_ARROW = { red: 0, green: 90, yellow: 180, blue: 270 };

export const absOf = (color, pos) => (META[color].start + pos) % 52;
export const canMove = (pos, d) => (pos === -1 ? d === 6 : pos !== LAST && pos + d <= LAST);
export const centerOf = (color, pos, i) => {
  if (pos === -1) return BASE[color][i];
  if (pos === LAST) return FINISH[color];
  const [r, c] = pos >= 51 ? HOME[color][pos - 51] : TRACK[absOf(color, pos)];
  return [r + 0.5, c + 0.5];
};

export const colorsFor = (n) => (n === 2 ? ['red', 'yellow'] : n === 3 ? ['red', 'green', 'yellow'] : COLORS);
export const rollDie = () => 1 + Math.floor(Math.random() * 6);

const freshTokens = (players) => Object.fromEntries(players.map((p) => [p.color, [-1, -1, -1, -1]]));

export const newGame = (players) => ({
  players: [...players].sort((a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color)),
  tokens: freshTokens(players),
  turn: 0, dice: null, phase: 'roll', sixes: 0, movable: [], winners: [], msg: '', last: null, seq: 0,
});

const nextTurn = (s) => {
  let t = s.turn;
  do { t = (t + 1) % s.players.length; } while (s.winners.includes(s.players[t].color));
  return { ...s, turn: t, phase: 'roll', sixes: 0, movable: [] };
};

// Apply a dice roll. Passes the turn automatically if nothing can move.
export const applyRoll = (s, d) => {
  const color = s.players[s.turn].color;
  const sixes = d === 6 ? s.sixes + 1 : 0;
  const base = { ...s, dice: d, sixes, seq: s.seq + 1, last: { type: 'roll', color, d } };
  if (sixes === 3) return { ...nextTurn(base), dice: d, msg: 'Three sixes. Turn lost.' };
  const movable = s.tokens[color].map((p, i) => (canMove(p, d) ? i : -1)).filter((i) => i >= 0);
  if (!movable.length) return { ...nextTurn(base), dice: d, msg: d === 6 ? 'No move possible' : 'No move. Need a 6.' };
  return { ...base, phase: 'move', movable, msg: '' };
};

// Move token i by the current dice. Handles capture, finishing, extra turns and game over.
export const applyMove = (s, i) => {
  if (s.phase !== 'move' || !s.movable.includes(i)) return s;
  const { color } = s.players[s.turn];
  const d = s.dice;
  const from = s.tokens[color][i];
  const to = from === -1 ? 0 : from + d;
  const tokens = { ...s.tokens, [color]: s.tokens[color].map((q, k) => (k === i ? to : q)) };

  let captured = 0;
  if (to <= 50 && !SAFE.includes(absOf(color, to))) {
    const abs = absOf(color, to);
    s.players.forEach((p) => {
      if (p.color === color) return;
      tokens[p.color] = tokens[p.color].map((q) => {
        if (q >= 0 && q <= 50 && absOf(p.color, q) === abs) { captured += 1; return -1; }
        return q;
      });
    });
  }

  let winners = s.winners;
  if (tokens[color].every((q) => q === LAST)) winners = [...winners, color];
  const last = { type: 'move', color, i, from, to, captured };
  const after = { ...s, tokens, winners, movable: [], seq: s.seq + 1, last };

  const left = s.players.filter((p) => !winners.includes(p.color));
  if (left.length <= 1) return { ...after, winners: [...winners, ...left.map((p) => p.color)], phase: 'over', msg: '' };

  if (!winners.includes(color) && (d === 6 || captured || to === LAST)) {
    return { ...after, phase: 'roll', msg: captured ? 'Knocked one out! Roll again' : to === LAST ? 'Home! Roll again' : 'Six! Roll again' };
  }
  return { ...nextTurn(after), msg: '' };
};

// Computer player: finish > capture > leave base > reach safety > advance furthest.
export const chooseMove = (s) => {
  const { color } = s.players[s.turn];
  const d = s.dice;
  let best = s.movable[0];
  let bestScore = -Infinity;
  s.movable.forEach((i) => {
    const pos = s.tokens[color][i];
    const to = pos === -1 ? 0 : pos + d;
    let score = to;
    if (to === LAST) score += 120;
    if (pos === -1) score += 70;
    if (to >= 51 && pos < 51) score += 40;
    if (to <= 50) {
      const abs = absOf(color, to);
      if (SAFE.includes(abs)) score += 25;
      else if (s.players.some((p) => p.color !== color && s.tokens[p.color].some((q) => q >= 0 && q <= 50 && absOf(p.color, q) === abs))) score += 90;
    }
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
};

// Only one sensible choice (single token, or all candidates still in base) → move it for the player.
export const autoPick = (s) => {
  if (s.phase !== 'move') return null;
  const { color } = s.players[s.turn];
  if (s.movable.length === 1 || s.movable.every((i) => s.tokens[color][i] === -1)) return s.movable[0];
  return null;
};
