import React, { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX, FiMessageCircle, FiX, FiSend, FiChevronLeft } from 'react-icons/fi';
import Board, { useWalkingTokens } from './Board';
import { META, LAST } from '../../lib/ludoEngine';
import { play, isMuted, setMuted } from '../../lib/sound';

export const EMOJIS = ['😂', '😎', '🔥', '😡', '😭', '👏', '😱', '🤣', '💪', '🙏', '😴', '🥳'];
export const PHRASES = ['Good luck!', 'Nice move!', 'Well played', 'Hurry up!', 'Oops!', 'So close!', 'Not again 😩', 'GG'];

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const CORNER = { red: 'tl', green: 'tr', yellow: 'br', blue: 'bl' };

export const Face = ({ p, size = 52 }) => (
  <div className="lb-face" style={{ width: size, height: size, '--c': META[p.color].hex }}>
    {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      : <span style={{ fontSize: size * 0.46 }}>{p.ai ? '🤖' : (p.name || '?')[0].toUpperCase()}</span>}
  </div>
);

const Bubble = ({ msg, side }) => (
  <div key={msg.id} className={`lb-bubble ${side === 'r' ? 'r' : 'l'} ${msg.kind === 'emoji' ? 'emoji' : ''}`}>{msg.text}</div>
);

const PlayerCard = ({ p, tokens, active, bubble, side, timer }) => {
  const home = (tokens[p.color] || []).filter((q) => q === LAST).length;
  return (
    <div className={`relative flex items-center gap-2 ${side === 'r' ? 'flex-row-reverse text-right' : ''}`}>
      {bubble && <Bubble msg={bubble} side={side} />}
      <div className={`lb-card ${active ? 'on' : ''}`} style={{ '--c': META[p.color].hex }}>
        <Face p={p} size={50} />
        {active && timer != null && (
          <svg className="absolute -inset-[5px] pointer-events-none" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#fff" strokeWidth="3"
              strokeDasharray="232" strokeDashoffset={232 * (1 - timer)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
        )}
      </div>
      <div className="min-w-0 max-w-[110px]">
        <p className={`text-[13px] font-extrabold truncate ${p.left ? 'line-through opacity-60' : ''}`}>{p.name}</p>
        <div className={`flex gap-[3px] mt-1 ${side === 'r' ? 'justify-end' : ''}`}>
          {[0, 1, 2, 3].map((k) => <span key={k} className="w-[9px] h-[9px] rounded-full border border-white/60" style={{ background: k < home ? META[p.color].hex : 'transparent' }} />)}
        </div>
        {p.left && <p className="text-[10px] text-white/60">left · auto-playing</p>}
      </div>
    </div>
  );
};

const Die = ({ value, rolling, ready, onClick, color }) => (
  <button type="button" onClick={onClick} disabled={!ready}
    className={`lb-die grid grid-cols-3 grid-rows-3 ${rolling ? 'dice-roll' : ''} ${ready ? 'ready' : ''}`}
    style={{ '--c': color }} aria-label={ready ? 'Roll the dice' : `Dice ${value || ''}`}>
    {Array.from({ length: 9 }).map((_, k) => (
      <span key={k} className="grid place-items-center">
        {value && PIPS[value].includes(k) && <span className="w-[62%] aspect-square rounded-full" style={{ background: value === 1 ? '#e8322f' : '#1b1b1b' }} />}
      </span>
    ))}
  </button>
);

const ChatSheet = ({ open, onClose, onSend, log, myColor }) => {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  useEffect(() => { if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [open, log.length]);
  if (!open) return null;
  const send = (kind, t) => { const v = t.trim().slice(0, 80); if (v) { onSend(kind, v); if (kind === 'text') setText(''); onClose(); } };
  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-end" onClick={onClose}>
      <div className="lb-sheet w-full max-w-xl mx-auto sheet-up safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="font-extrabold text-[16px]">Chat</p>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center text-[20px]" aria-label="Close chat"><FiX /></button>
        </div>
        {log.length > 0 && (
          <div ref={listRef} className="max-h-[22vh] overflow-y-auto px-4 space-y-1.5 py-1">
            {log.map((m) => (
              <p key={m.id} className="text-[13px] leading-snug">
                <b style={{ color: META[m.color]?.light || '#fff' }}>{m.color === myColor ? 'You' : m.name}:</b> <span className={m.kind === 'emoji' ? 'text-[18px]' : ''}>{m.text}</span>
              </p>
            ))}
          </div>
        )}
        <div className="grid grid-cols-6 gap-1.5 px-4 pt-3">
          {EMOJIS.map((e) => <button key={e} onClick={() => send('emoji', e)} className="lb-chip text-[26px] h-12 press">{e}</button>)}
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {PHRASES.map((q) => <button key={q} onClick={() => send('text', q)} className="lb-chip px-3 h-9 text-[13px] font-bold press">{q}</button>)}
        </div>
        <form className="flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); send('text', text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Type a message…"
            className="flex-1 h-11 px-4 rounded-full bg-white/10 border border-white/25 text-white placeholder:text-white/50 outline-none focus:border-white" />
          <button type="submit" className="w-11 h-11 rounded-full bg-[#f7c51e] text-black grid place-items-center text-[18px] press" aria-label="Send"><FiSend /></button>
        </form>
      </div>
    </div>
  );
};

/**
 * Shared game screen for offline and online games.
 * state: engine state; myColors: colors this phone controls (all humans for pass & play);
 * onRoll(), onPick(i); messages: [{id,color,name,kind,text,ts}]; onSend(kind,text);
 * title: chip text (e.g. room code); turnTimer: 0..1 remaining for the active player (online).
 */
const GameScreen = ({ state, myColors, onRoll, onPick, messages = [], onSend, title, onQuit, onAgain, againLabel = 'Play again', turnTimer, waitingAgain }) => {
  const [muted, setMutedState] = useState(isMuted());
  const [chat, setChat] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(state.dice);
  const [tokens, walking] = useWalkingTokens(state.tokens);
  const seenSeq = useRef(state.seq);
  const [unread, setUnread] = useState(0);
  const seenMsg = useRef(new Set(messages.map((m) => m.id)));

  const cur = state.players[state.turn];
  const mine = myColors.includes(cur.color) && !cur.ai && !cur.left;

  // dice animation + sounds for every new event, whoever made it
  useEffect(() => {
    if (state.seq === seenSeq.current) return undefined;
    seenSeq.current = state.seq;
    const l = state.last;
    if (!l) return undefined;
    if (l.type === 'roll') {
      setRolling(true);
      play('roll');
      let k = 0;
      const spin = setInterval(() => { setFace(1 + ((k += 1) % 6)); }, 60);
      const t = setTimeout(() => { clearInterval(spin); setRolling(false); setFace(l.d); play('dice'); if (state.msg && state.phase !== 'move') play('nomove'); }, 480);
      return () => { clearInterval(spin); clearTimeout(t); };
    }
    if (l.type === 'move') {
      if (l.from === -1) play('out');
      const delay = l.from === -1 ? 150 : (l.to - l.from) * 140 + 80;
      const t = setTimeout(() => {
        if (l.captured) { play('capture'); if (navigator.vibrate) navigator.vibrate([40, 40, 60]); }
        if (l.to === LAST) play('home');
        if (state.phase === 'over') play('win');
      }, delay);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seq]);

  useEffect(() => { if (!rolling) setFace(state.dice); }, [state.dice, rolling]);
  useEffect(() => { if (mine && state.phase === 'roll') play('turn'); }, [mine, state.turn, state.phase]);

  // speech bubbles: newest message per color, for 4 seconds
  const [bubbles, setBubbles] = useState({});
  useEffect(() => {
    const fresh = messages.filter((m) => !seenMsg.current.has(m.id));
    fresh.forEach((m) => seenMsg.current.add(m.id));
    if (!fresh.length) return;
    if (!chat) setUnread((u) => u + fresh.filter((m) => !myColors.includes(m.color)).length);
    fresh.forEach((m) => {
      if (Date.now() - (m.ts || 0) > 8000) return;
      setBubbles((b) => ({ ...b, [m.color]: m }));
      setTimeout(() => setBubbles((b) => (b[m.color]?.id === m.id ? { ...b, [m.color]: null } : b)), 4000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const busy = rolling || walking;
  const canRoll = mine && state.phase === 'roll' && !busy;
  const pickable = mine && state.phase === 'move' && !busy ? state.movable : [];
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };

  const byCorner = (c) => state.players.find((p) => CORNER[p.color] === c);
  const card = (corner, side) => {
    const p = byCorner(corner);
    if (!p) return <div />;
    const active = p.color === cur.color && state.phase !== 'over';
    return <PlayerCard p={p} tokens={tokens} active={active} bubble={bubbles[p.color]} side={side} timer={active ? turnTimer : null} />;
  };

  const status = state.msg || (state.phase === 'over' ? '' : mine
    ? (state.phase === 'roll' ? 'Your turn. Tap the dice!' : 'Tap a glowing piece')
    : `${cur.name}'s turn`);

  const winner = state.phase === 'over' ? state.players.find((p) => p.color === state.winners[0]) : null;

  return (
    <div className="lb-bg lb-page text-white">
      <div className="flex items-center gap-2 px-3 pt-3">
        <button onClick={onQuit} className="lb-round press" aria-label="Leave game"><FiChevronLeft className="text-[22px]" /></button>
        {title && <span className="lb-chip px-3 h-9 grid place-items-center text-[12px] font-extrabold tracking-wider">{title}</span>}
        <span className="flex-1" />
        <button onClick={toggleMute} className="lb-round press" aria-label={muted ? 'Sound on' : 'Mute'}>{muted ? <FiVolumeX /> : <FiVolume2 />}</button>
        {onSend && (
          <button onClick={() => { setChat(true); setUnread(0); }} className="lb-round press relative" aria-label="Chat and emojis">
            <FiMessageCircle />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e8322f] text-[10px] font-bold grid place-items-center">{unread}</span>}
          </button>
        )}
      </div>

      <div className="mx-auto px-3" style={{ width: 'min(100%, 520px)' }}>
        <div className="grid grid-cols-2 gap-2 mt-4 mb-3 min-h-[60px]">{card('tl', 'l')}{card('tr', 'r')}</div>
        <Board players={state.players} tokens={tokens} active={cur.color} pickable={pickable} onPick={onPick} />

        <div className="lb-dock mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {card('bl', 'l')}
          <div className="flex flex-col items-center">
            <Die value={face} rolling={rolling} ready={canRoll} onClick={onRoll} color={META[cur.color].hex} />
          </div>
          {card('br', 'r')}
        </div>

        <p className="text-center text-[14px] font-bold mt-3 min-h-[20px]" aria-live="polite">
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: META[cur.color].hex }} />{status}
        </p>
      </div>

      <ChatSheet open={chat} onClose={() => setChat(false)} onSend={onSend} log={messages} myColor={myColors[0]} />

      {winner && !walking && (
        <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-center p-6">
          <div className="lb-win w-full max-w-sm text-center rise">
            <div className="text-[54px] leading-none -mt-12">🏆</div>
            <Face p={winner} size={72} />
            <h2 className="text-[34px] font-black mt-3">{myColors.includes(winner.color) && myColors.length === 1 ? 'You win!' : `${winner.name} wins!`}</h2>
            <ol className="mt-4 text-left space-y-1.5">
              {state.winners.map((col, k) => {
                const p = state.players.find((x) => x.color === col);
                return (
                  <li key={col} className="flex items-center gap-3 bg-white/10 rounded-xl px-3 h-11">
                    <span className="font-black w-5">{k + 1}</span>
                    <span className="w-3 h-3 rounded-full" style={{ background: META[col].hex }} />
                    <span className="font-bold flex-1 truncate">{p.name}</span>
                    {k === 0 && <span>👑</span>}
                  </li>
                );
              })}
            </ol>
            <div className="grid grid-cols-2 gap-2 mt-5">
              {onAgain ? <button onClick={onAgain} className="lb-btn gold h-12">{againLabel}</button>
                : <span className="h-12 grid place-items-center text-[13px] text-white/70">{waitingAgain || ''}</span>}
              <button onClick={onQuit} className="lb-btn h-12">Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
