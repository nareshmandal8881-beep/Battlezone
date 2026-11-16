// Online Ludo rooms on Firestore. A room is one document `ludoRooms/{CODE}`; chat lives in `ludoRooms/{CODE}/chat`.
import {
  addDoc, collection, doc, getDoc, runTransaction, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLORS, newGame } from './ludoEngine';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid typos
export const TURN_SECONDS = 30;

const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const roomRef = (code) => doc(db, 'ludoRooms', code);

const seatColors = (max) => (max === 2 ? ['red', 'yellow'] : COLORS);
export const meAsPlayer = (user, profile) => ({
  uid: user.uid,
  name: (profile?.username || user.displayName || 'Player').slice(0, 16),
  photo: profile?.photoURL || user.photoURL || null,
});

export const createRoom = async (user, profile, maxPlayers) => {
  for (let tries = 0; tries < 5; tries += 1) {
    const code = makeCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = (await getDoc(roomRef(code))).exists();
    if (!exists) {
      const me = { ...meAsPlayer(user, profile), color: seatColors(maxPlayers)[0] };
      // eslint-disable-next-line no-await-in-loop
      await setDoc(roomRef(code), {
        code, host: user.uid, maxPlayers, status: 'waiting', players: [me], uids: [user.uid], game: null,
        createdAt: serverTimestamp(), updatedAt: Date.now(),
      });
      return code;
    }
  }
  throw new Error('Could not create a room, try again');
};

// Take a free seat if the room is still waiting. Returns 'joined' | 'already' | reason string.
export const joinRoom = (code, user, profile) => runTransaction(db, async (tx) => {
  const snap = await tx.get(roomRef(code));
  if (!snap.exists()) return 'Room not found';
  const r = snap.data();
  if (r.uids.includes(user.uid)) return 'already';
  if (r.status !== 'waiting') return 'This game has already started';
  if (r.players.length >= r.maxPlayers) return 'Room is full';
  const taken = r.players.map((p) => p.color);
  const color = seatColors(r.maxPlayers).find((c) => !taken.includes(c));
  tx.update(roomRef(code), {
    players: [...r.players, { ...meAsPlayer(user, profile), color }],
    uids: [...r.uids, user.uid],
    updatedAt: Date.now(),
  });
  return 'joined';
});

export const startGame = (code) => runTransaction(db, async (tx) => {
  const snap = await tx.get(roomRef(code));
  const r = snap.data();
  if (r.players.filter((p) => !p.left).length < 2) throw new Error('Need at least 2 players');
  const players = r.players.filter((p) => !p.left);
  tx.update(roomRef(code), {
    status: 'playing',
    players,
    uids: players.map((p) => p.uid),
    game: { ...newGame(players), turnAt: Date.now() },
    updatedAt: Date.now(),
  });
});

// Apply `fn(game)` only if nobody else changed the game since we looked (seq check).
export const act = (code, seq, fn) => runTransaction(db, async (tx) => {
  const snap = await tx.get(roomRef(code));
  const r = snap.data();
  if (!r?.game || r.game.seq !== seq) return false;
  const next = fn(r.game);
  if (next === r.game) return false;
  tx.update(roomRef(code), {
    game: { ...next, turnAt: Date.now() },
    status: next.phase === 'over' ? 'over' : r.status,
    updatedAt: Date.now(),
  });
  return true;
});

// Leaving: in the lobby the seat is freed; during a game the player is marked as left and auto-played.
export const leaveRoom = (code, uid) => runTransaction(db, async (tx) => {
  const snap = await tx.get(roomRef(code));
  if (!snap.exists()) return;
  const r = snap.data();
  if (r.status === 'waiting') {
    const players = r.players.filter((p) => p.uid !== uid);
    const patch = { players, uids: players.map((p) => p.uid), updatedAt: Date.now() };
    if (r.host === uid && players.length) patch.host = players[0].uid;
    tx.update(roomRef(code), patch);
    return;
  }
  const mark = (list) => list.map((p) => (p.uid === uid ? { ...p, left: true } : p));
  tx.update(roomRef(code), {
    players: mark(r.players),
    ...(r.game ? { game: { ...r.game, players: mark(r.game.players) } } : {}),
    updatedAt: Date.now(),
  });
});

export const rematch = (code) => runTransaction(db, async (tx) => {
  const snap = await tx.get(roomRef(code));
  const r = snap.data();
  const players = r.players.filter((p) => !p.left);
  if (players.length < 2) throw new Error('Not enough players left for a rematch');
  tx.update(roomRef(code), {
    status: 'playing', players, uids: players.map((p) => p.uid),
    game: { ...newGame(players), turnAt: Date.now() }, updatedAt: Date.now(),
  });
});

export const sendChat = (code, player, kind, text) => addDoc(collection(db, 'ludoRooms', code, 'chat'), {
  uid: player.uid, name: player.name, color: player.color, kind, text: String(text).slice(0, 80), ts: Date.now(), at: serverTimestamp(),
});
