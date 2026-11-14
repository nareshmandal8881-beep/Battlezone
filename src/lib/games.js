import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Used until Firestore answers (or if it's empty).
export const DEFAULT_GAMES = [
  { id: 'bgmi', name: 'BGMI', color: '#f2a900', published: true, order: 1 },
  { id: 'free-fire', name: 'Free Fire', color: '#ff5a1f', published: true, order: 2 },
  { id: 'cod', name: 'COD', color: '#3fae49', published: true, order: 3 },
  { id: 'valorant', name: 'Valorant', color: '#ff4655', published: true, order: 4 },
  { id: 'pubg', name: 'PUBG', color: '#e8a33d', published: true, order: 5 },
  { id: 'ludo', name: 'Ludo', color: '#2f6fe4', published: true, order: 6 },
];

let cache = null;

export const loadGames = async () => {
  const snap = await getDocs(collection(db, 'games'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 99) - (b.order || 99));
  cache = list.length ? list : DEFAULT_GAMES;
  return cache;
};

export const invalidateGames = () => { cache = null; };

// Published games for players; pass { all: true } in admin screens.
export const useGames = ({ all = false } = {}) => {
  const [games, setGames] = useState(cache || DEFAULT_GAMES);
  useEffect(() => {
    let on = true;
    loadGames().then((g) => on && setGames(g)).catch(() => {});
    return () => { on = false; };
  }, []);
  return all ? games : games.filter((g) => g.published !== false);
};

// Tournaments without the field are treated as published (older data).
export const isPublished = (t) => t.published !== false;
