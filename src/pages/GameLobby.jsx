import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// EMOTES & QUICK CHAT
// ─────────────────────────────────────────────
const EMOTES = [
  { id: 1, emoji: '😂', label: 'LOL' },
  { id: 2, emoji: '😤', label: 'GG' },
  { id: 3, emoji: '👏', label: 'Clap' },
  { id: 4, emoji: '🔥', label: 'Fire' },
  { id: 5, emoji: '💀', label: 'Dead' },
  { id: 6, emoji: '😎', label: 'Cool' },
  { id: 7, emoji: '😡', label: 'Angry' },
  { id: 8, emoji: '🏆', label: 'Win' },
  { id: 9, emoji: '👍', label: 'GG' },
  { id: 10, emoji: '🤣', label: 'Haha' },
  { id: 11, emoji: '😱', label: 'Wow' },
  { id: 12, emoji: '💪', label: 'Strong' },
];

const QUICK_MSGS = [
  'Good luck! 🤞', 'Nice move! 👌', 'GG WP! 🏆',
  'Haha gotcha! 😂', 'So close! 😅', 'Watch out! ⚠️',
  "Let's go! 🔥", 'Noice! 😎',
];

// ─────────────────────────────────────────────
// GENERATE ROOM ID (6-char alphanumeric)
// ─────────────────────────────────────────────
const genRoomId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const getTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────
// LUDO BOARD VISUAL
// ─────────────────────────────────────────────
const LudoBoard = () => (
  <div
    className="relative mx-auto rounded-xl overflow-hidden shadow-2xl"
    style={{ width: 300, height: 300, border: '3px solid rgba(255,255,255,0.3)' }}
  >
    <div className="grid grid-cols-3 h-full" style={{ gap: 1, background: 'rgba(255,255,255,0.3)' }}>
      <div className="rounded-tl-xl flex flex-wrap gap-1 p-2 items-center justify-center" style={{ background: '#ef4444' }}>
        {['🔴','🔴','🔴','🔴'].map((p,i)=><span key={i} className="text-xl">{p}</span>)}
      </div>
      <div className="flex items-center justify-center" style={{ background: 'white' }}>
        <span className="text-gray-400 text-xs">↓</span>
      </div>
      <div className="rounded-tr-xl flex flex-wrap gap-1 p-2 items-center justify-center" style={{ background: '#16a34a' }}>
        {['🟢','🟢','🟢','🟢'].map((p,i)=><span key={i} className="text-xl opacity-70">{p}</span>)}
      </div>
      <div className="flex items-center justify-center" style={{ background: 'white' }}>
        <span className="text-gray-400 text-xs">→</span>
      </div>
      <div className="flex items-center justify-center" style={{ background: 'white' }}>
        <div className="w-10 h-10 rounded-full" style={{ background: 'conic-gradient(#ef4444 0deg 90deg,#16a34a 90deg 180deg,#3b82f6 180deg 270deg,#eab308 270deg 360deg)' }}></div>
      </div>
      <div className="flex items-center justify-center" style={{ background: 'white' }}>
        <span className="text-gray-400 text-xs">←</span>
      </div>
      <div className="rounded-bl-xl flex flex-wrap gap-1 p-2 items-center justify-center" style={{ background: '#3b82f6' }}>
        {['🔵','🔵','🔵','🔵'].map((p,i)=><span key={i} className="text-xl opacity-70">{p}</span>)}
      </div>
      <div className="flex items-center justify-center" style={{ background: 'white' }}>
        <span className="text-gray-400 text-xs">↑</span>
      </div>
      <div className="rounded-br-xl flex flex-wrap gap-1 p-2 items-center justify-center" style={{ background: '#eab308' }}>
        {['🟡','🟡','🟡','🟡'].map((p,i)=><span key={i} className="text-xl">{p}</span>)}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// EMOTE PANEL
// ─────────────────────────────────────────────
const EmotePanel = ({ onSelect, onClose }) => (
  <div
    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 p-3 rounded-2xl shadow-2xl"
    style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: '2px solid rgba(255,69,0,0.5)', minWidth: 280 }}
  >
    <div className="flex justify-between items-center mb-2">
      <span className="text-orange-400 font-bold text-sm" style={{ fontFamily: 'Orbitron' }}>EMOTES</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
    </div>
    <div className="grid grid-cols-6 gap-2 mb-3">
      {EMOTES.map(e => (
        <button key={e.id} onClick={() => onSelect({ ...e, isMsg: false })}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:scale-110 active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <span className="text-2xl">{e.emoji}</span>
          <span className="text-gray-400 text-[9px]">{e.label}</span>
        </button>
      ))}
    </div>
    <div className="border-t border-gray-700 pt-2">
      <p className="text-gray-500 text-xs mb-2">QUICK CHAT</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_MSGS.map((m,i) => (
          <button key={i} onClick={() => onSelect({ label: m, isMsg: true })}
            className="px-2 py-1 rounded-full text-xs font-semibold hover:scale-105 transition-all"
            style={{ background: 'rgba(255,69,0,0.2)', color: '#fb923c', border: '1px solid rgba(255,69,0,0.3)' }}>
            {m}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────
const ChatBubble = ({ msg, isMe }) => (
  <div className={`flex items-end gap-2 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
    <span className="text-2xl">{msg.avatar}</span>
    <div className="max-w-[70%] px-3 py-2 rounded-2xl text-sm font-semibold shadow-lg"
      style={{
        background: isMe
          ? 'linear-gradient(135deg,#FF4500,#E94560)'
          : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
        color: 'white',
        borderBottomRightRadius: isMe ? 4 : 16,
        borderBottomLeftRadius: isMe ? 16 : 4,
      }}>
      {msg.isEmote ? <span className="text-3xl">{msg.text}</span> : <span>{msg.text}</span>}
      <div className="text-[10px] opacity-60 mt-0.5">{msg.time}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// CHAT DRAWER
// ─────────────────────────────────────────────
const ChatDrawer = ({ open, messages, onSend, onEmote, onClose, myId }) => {
  const [text, setText] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg,#1a0a00,#FF4500)', borderBottom: '2px solid rgba(255,69,0,0.5)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span className="text-white font-black" style={{ fontFamily: 'Orbitron', fontSize: 15 }}>ROOM CHAT</span>
        </div>
        <button onClick={onClose} className="text-white text-xl font-bold">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 relative">
        {messages.length === 0 && (
          <div className="text-center mt-20 text-gray-500">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold">No messages yet</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} isMe={msg.senderId === myId} />
        ))}
        <div ref={endRef} />

        {showEmotes && (
          <EmotePanel
            onSelect={(e) => {
              if (e.isMsg) onSend(e.label);
              else onEmote(e);
              setShowEmotes(false);
            }}
            onClose={() => setShowEmotes(false)}
          />
        )}
      </div>

      <div className="px-3 py-3 flex items-center gap-2"
        style={{ background: '#0f172a', borderTop: '2px solid rgba(255,69,0,0.3)' }}>
        <button onClick={() => setShowEmotes(!showEmotes)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110"
          style={{ background: 'rgba(255,69,0,0.2)', border: '1px solid rgba(255,69,0,0.5)' }}>
          😀
        </button>
        <input
          type="text" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-full text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        />
        <button onClick={handleSend} disabled={!text.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110 disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg,#FF4500,#E94560)' }}>
          ➤
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// FLOATING EMOTE
// ─────────────────────────────────────────────
const FloatingEmote = ({ emote }) => (
  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-6xl"
    style={{ animation: 'floatUp 2s ease-out forwards' }}>
    {emote}
  </div>
);

// ─────────────────────────────────────────────
// ===== MAIN COMPONENT =====
// ─────────────────────────────────────────────
const GameLobby = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Screens: 'home' | 'waiting' | 'game'
  const [screen, setScreen] = useState('home');
  const [roomId, setRoomId] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState(null);
  const [unread, setUnread] = useState(0);

  const myName = userProfile?.username || currentUser?.displayName || 'Player';
  const myAvatar = '🧑🏿‍🦱';
  const myId = currentUser?.uid || 'guest';

  // ── Real-time room listener ──
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'gameRooms', roomId), (snap) => {
      if (!snap.exists()) {
        toast.error('Room closed!');
        setScreen('home');
        setRoomId('');
        return;
      }
      const data = snap.data();
      setRoomData(data);

      // Chat messages
      if (data.messages) {
        setMessages(data.messages);
        if (!chatOpen) setUnread(data.messages.length);
      }

      // Both players joined → go to game
      if (data.player1 && data.player2 && screen === 'waiting') {
        setScreen('game');
        toast.success('🎮 Game starting!');
      }
    });
    return () => unsub();
  }, [roomId, chatOpen]);

  // ── CREATE ROOM ──
  const handleCreateRoom = async () => {
    if (!currentUser) { toast.error('Please login first!'); navigate('/login'); return; }
    setLoading(true);
    try {
      const id = genRoomId();
      await setDoc(doc(db, 'gameRooms', id), {
        roomId: id,
        status: 'waiting',
        createdAt: serverTimestamp(),
        player1: {
          uid: myId,
          name: myName,
          avatar: myAvatar,
          ready: false,
        },
        player2: null,
        messages: [],
      });
      setRoomId(id);
      setIsHost(true);
      setScreen('waiting');
      toast.success(`Room created! Share ID: ${id}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create room');
    }
    setLoading(false);
  };

  // ── JOIN ROOM ──
  const handleJoinRoom = async () => {
    if (!currentUser) { toast.error('Please login first!'); navigate('/login'); return; }
    const id = inputRoom.trim().toUpperCase();
    if (!id || id.length < 4) { toast.error('Enter valid Room ID'); return; }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'gameRooms', id));
      if (!snap.exists()) { toast.error('Room not found!'); setLoading(false); return; }
      const data = snap.data();
      if (data.player2) { toast.error('Room is full!'); setLoading(false); return; }
      if (data.player1?.uid === myId) { toast.error("You can't join your own room!"); setLoading(false); return; }

      await updateDoc(doc(db, 'gameRooms', id), {
        player2: {
          uid: myId,
          name: myName,
          avatar: '👮',
          ready: false,
        },
        status: 'ready',
      });
      setRoomId(id);
      setIsHost(false);
      setRoomData({ ...data, player2: { uid: myId, name: myName, avatar: '👮' } });
      setScreen('game');
      toast.success('🔥 Joined! Game starting!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to join room');
    }
    setLoading(false);
  };

  // ── LEAVE ROOM ──
  const handleLeaveRoom = async () => {
    if (!roomId) { setScreen('home'); return; }
    try {
      if (isHost) {
        await deleteDoc(doc(db, 'gameRooms', roomId));
      } else {
        await updateDoc(doc(db, 'gameRooms', roomId), { player2: null, status: 'waiting' });
      }
    } catch (e) {}
    setRoomId('');
    setRoomData(null);
    setMessages([]);
    setScreen('home');
    toast('Left the room');
  };

  // ── SEND MESSAGE ──
  const handleSend = async (text) => {
    if (!roomId) return;
    const msg = {
      senderId: myId,
      senderName: myName,
      avatar: myAvatar,
      text,
      time: getTime(),
      isEmote: false,
    };
    const updated = [...messages, msg];
    setMessages(updated);
    try {
      await updateDoc(doc(db, 'gameRooms', roomId), { messages: updated });
    } catch (e) {}
  };

  // ── SEND EMOTE ──
  const handleEmote = async (e) => {
    if (!roomId) return;
    const msg = {
      senderId: myId,
      senderName: myName,
      avatar: myAvatar,
      text: e.emoji,
      time: getTime(),
      isEmote: true,
    };
    const updated = [...messages, msg];
    setMessages(updated);
    setFloatingEmote(e.emoji);
    setTimeout(() => setFloatingEmote(null), 2000);
    try {
      await updateDoc(doc(db, 'gameRooms', roomId), { messages: updated });
    } catch (e) {}
  };

  const handleChatOpen = () => { setChatOpen(true); setUnread(0); };

  const p1 = roomData?.player1;
  const p2 = roomData?.player2;

  // ════════════════════════════════════════════
  // SCREEN: HOME
  // ════════════════════════════════════════════
  if (screen === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: 'linear-gradient(180deg,#7f1d1d 0%,#991b1b 50%,#7f1d1d 100%)' }}>

        {/* Top bar */}
        <div className="w-full max-w-sm flex justify-between items-center mb-8 px-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <span className="text-yellow-400 font-black text-sm">🪙 {userProfile?.coins || 1250}</span>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#ca8a04,#eab308)' }}>🎵</button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#ca8a04,#eab308)' }}>🔊</button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">👑</div>
          <div className="font-black text-5xl mb-1 tracking-widest"
            style={{ fontFamily: 'Orbitron', background: 'linear-gradient(to bottom,#fde68a,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BATTLEZONE
          </div>
          <div className="text-orange-300 font-bold tracking-widest text-sm">LUDO TOURNAMENT</div>
        </div>

        {/* Game Mode Badge */}
        <div className="flex mb-6 rounded-xl overflow-hidden shadow-lg" style={{ border: '2px solid rgba(255,255,255,0.3)' }}>
          <div className="px-6 py-3 font-black text-white" style={{ background: 'rgba(0,0,0,0.4)' }}>Game Mode</div>
          <div className="px-6 py-3 font-black text-white" style={{ background: 'linear-gradient(135deg,#FF4500,#E94560)' }}>Entry Amount</div>
        </div>
        <div className="flex items-center gap-6 mb-10 px-6 py-3 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.4)' }}>
          <span className="text-2xl">🏅</span>
          <span className="text-yellow-400 font-black text-lg" style={{ fontFamily: 'Orbitron' }}>Classic</span>
          <span className="text-white font-black text-lg ml-4">₹1,000</span>
        </div>

        {/* CREATE ROOM */}
        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-lg mb-4 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: 'white', fontFamily: 'Orbitron', letterSpacing: 2, boxShadow: '0 8px 32px rgba(34,197,94,0.5)' }}>
          {loading ? '⏳ Creating...' : '🏠 CREATE ROOM'}
        </button>

        {/* JOIN ROOM */}
        <div className="w-full max-w-xs space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputRoom}
              onChange={e => setInputRoom(e.target.value.toUpperCase())}
              placeholder="Enter Room ID..."
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl text-white font-black text-center tracking-widest outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', fontSize: 18 }}
            />
            <button
              onClick={handleJoinRoom}
              disabled={loading || !inputRoom.trim()}
              className="px-5 py-3 rounded-xl font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', fontFamily: 'Orbitron', fontSize: 13 }}>
              {loading ? '...' : 'JOIN'}
            </button>
          </div>
          <p className="text-orange-200 text-xs text-center opacity-70">
            Ask your friend for their Room ID to join
          </p>
        </div>

        {/* OR play online */}
        <div className="mt-8 flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-white opacity-20"></div>
          <span className="text-white opacity-40 text-xs">OR</span>
          <div className="flex-1 h-px bg-white opacity-20"></div>
        </div>
        <button className="mt-4 w-full max-w-xs py-3 rounded-2xl font-black text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'Orbitron', letterSpacing: 1 }}>
          🌐 QUICK MATCH ONLINE
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // SCREEN: WAITING (host waits for player 2)
  // ════════════════════════════════════════════
  if (screen === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'linear-gradient(180deg,#0a1628,#1e3a5f)' }}>

        <div className="w-full max-w-sm text-center">
          {/* Room ID Display */}
          <div className="mb-8">
            <p className="text-gray-400 text-sm mb-2 font-semibold">🏠 YOUR ROOM ID</p>
            <div
              className="inline-block px-8 py-5 rounded-2xl mb-3 relative"
              style={{ background: 'linear-gradient(135deg,#FF4500,#E94560)', boxShadow: '0 0 40px rgba(255,69,0,0.6)' }}>
              <div className="text-white font-black tracking-[8px]"
                style={{ fontFamily: 'Orbitron', fontSize: 32 }}>
                {roomId}
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Room ID copied! 📋'); }}
              className="flex items-center gap-2 mx-auto px-5 py-2 rounded-full font-bold text-sm transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
              📋 Copy Room ID
            </button>
            <p className="text-gray-400 text-xs mt-2">Share this ID with your friend</p>
          </div>

          {/* Players waiting */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {/* Host */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-2 mx-auto"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '3px solid #60a5fa', boxShadow: '0 0 20px rgba(96,165,250,0.5)' }}>
                🧑🏿‍🦱
              </div>
              <div className="text-white font-bold text-sm">{myName}</div>
              <div className="text-green-400 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div> Ready
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-3xl animate-pulse">⚔️</div>
              <div className="text-orange-400 font-black text-sm" style={{ fontFamily: 'Orbitron' }}>VS</div>
            </div>

            {/* Waiting slot */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2 mx-auto"
                style={{ background: 'rgba(255,255,255,0.05)', border: '3px dashed rgba(255,255,255,0.3)' }}>
                <div className="text-center">
                  <div className="text-2xl mb-1">?</div>
                  <div className="text-gray-400 text-[9px]">Waiting...</div>
                </div>
              </div>
              <div className="text-gray-400 font-bold text-sm">Friend</div>
              <div className="text-orange-400 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div> Waiting
              </div>
            </div>
          </div>

          {/* Spinner */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            <p className="text-gray-400 text-sm">Waiting for friend to join...</p>
          </div>

          {/* Leave */}
          <button onClick={handleLeaveRoom}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
            ✕ Cancel Room
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // SCREEN: GAME
  // ════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0a1628,#1e3a5f,#0a1628)' }}>

      {/* BG Pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#1e40af 0px,#1e40af 2px,transparent 2px,transparent 20px)', backgroundSize: '28px 28px' }}>
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2"
        style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <button onClick={handleLeaveRoom} className="text-gray-400 hover:text-white text-sm">← Exit</button>
        </div>

        {/* Room ID */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,69,0,0.2)', border: '1px solid rgba(255,69,0,0.5)' }}>
          <span className="text-orange-400 text-xs font-bold" style={{ fontFamily: 'Orbitron' }}>ROOM:</span>
          <span className="text-white font-black tracking-widest" style={{ fontFamily: 'Orbitron', fontSize: 13 }}>{roomId}</span>
          <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Copied!'); }}
            className="text-orange-300 text-xs hover:text-white">📋</button>
        </div>

        {/* Chat button */}
        <button onClick={handleChatOpen}
          className="relative px-3 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(255,69,0,0.3)', border: '1px solid #FF4500', color: '#ff8c5a' }}>
          💬
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{ background: '#FF4500' }}>{unread}</span>
          )}
        </button>
      </div>

      {/* Opponent info */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div></div>
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', border: '2px solid #f87171' }}>
            {p2?.avatar || '👮'}
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-xs">{p2?.name || 'Waiting...'}</div>
            <div className={`text-xs font-bold flex items-center gap-1 justify-end ${p2 ? 'text-green-400' : 'text-orange-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${p2 ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`}></div>
              {p2 ? 'Connected' : 'Waiting...'}
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 py-3">
        {!p2 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="text-center p-6 rounded-2xl"
              style={{ background: '#1A1A2E', border: '2px solid rgba(255,69,0,0.5)' }}>
              <div className="text-4xl mb-3 animate-bounce">⏳</div>
              <p className="text-white font-bold mb-1">Waiting for opponent...</p>
              <div className="mt-3 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.3)' }}>
                <p className="text-orange-400 text-xs mb-1">Share Room ID with friend:</p>
                <p className="text-white font-black tracking-widest text-xl" style={{ fontFamily: 'Orbitron' }}>{roomId}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Copied!'); }}
                className="mt-3 px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: 'rgba(255,69,0,0.3)', color: '#ff8c5a', border: '1px solid rgba(255,69,0,0.5)' }}>
                📋 Copy ID
              </button>
            </div>
          </div>
        )}

        <LudoBoard />

        {/* Dice */}
        <div className="flex items-center gap-4 mt-5">
          <button className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-all hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', border: '3px solid white', boxShadow: '0 4px 20px rgba(34,197,94,0.5)' }}>
            🎲
          </button>
        </div>

        {floatingEmote && <FloatingEmote emote={floatingEmote} />}
      </div>

      {/* Bottom Player Bar */}
      <div className="relative z-10 px-3 py-3"
        style={{ background: 'rgba(0,0,0,0.85)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between gap-2">
          {/* Me */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', border: '2px solid #60a5fa' }}>
              {myAvatar}
            </div>
            <div>
              <div className="text-white font-black text-xs flex items-center gap-1" style={{ fontFamily: 'Orbitron' }}>
                {myName}
                <span className="text-[8px] px-1 rounded" style={{ background: '#FF4500' }}>YOU</span>
              </div>
              <div className="text-yellow-400 text-xs">🪙 {userProfile?.coins || 1250}</div>
            </div>
          </div>

          {/* Dice center */}
          <button className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-all hover:scale-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', border: '3px solid white' }}>
            🎲
          </button>

          {/* Opponent */}
          <div className="flex items-center gap-2 flex-1 flex-row-reverse">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', border: '2px solid #f87171' }}>
              {p2?.avatar || '?'}
            </div>
            <div className="text-right">
              <div className="text-white font-black text-xs" style={{ fontFamily: 'Orbitron' }}>{p2?.name || '...'}</div>
              <div className="text-yellow-400 text-xs">🪙 3,050</div>
            </div>
          </div>
        </div>

        {/* Quick Emote Bar */}
        <div className="flex items-center justify-center gap-3 mt-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {EMOTES.slice(0, 6).map(e => (
            <button key={e.id} onClick={() => handleEmote(e)}
              className="text-2xl transition-all hover:scale-125 active:scale-95" title={e.label}>
              {e.emoji}
            </button>
          ))}
          <button onClick={handleChatOpen}
            className="relative w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'rgba(255,69,0,0.3)', border: '1px solid #FF4500', color: '#ff8c5a' }}>
            💬
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: '#FF4500' }}>{unread}</span>
            )}
          </button>
        </div>
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        open={chatOpen}
        messages={messages}
        onSend={handleSend}
        onEmote={handleEmote}
        onClose={() => setChatOpen(false)}
        myId={myId}
      />

      {/* Float Up CSS */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -120px) scale(1.5); }
        }
      `}</style>
    </div>
  );
};

export default GameLobby;
