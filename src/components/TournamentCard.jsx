import React from 'react';
import { Link } from 'react-router-dom';
import { StatusTag, rupees } from './ui';

const TournamentCard = ({ tournament }) => {
  const {
    id, name, game, entryFee, prizePool, maxSlots = 0, registeredPlayers = [],
    date, time, status = 'upcoming', bannerUrl, mode, map,
  } = tournament;

  const joined = registeredPlayers.length;
  const left = Math.max(maxSlots - joined, 0);
  const fill = maxSlots ? Math.min((joined / maxSlots) * 100, 100) : 0;

  return (
    <Link to={`/tournament/${id}`} className="group block box hover:border-ink lift press">
      <div className="relative aspect-[16/8] bg-[#f1efea] border-b border-line overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 p-4 flex items-end">
            <span className="display text-[40px] text-[#d8d4cb] uppercase">{game}</span>
          </div>
        )}
        <div className="absolute top-3 left-3"><StatusTag status={status} /></div>
      </div>

      <div className="p-4">
        <p className="eyebrow mb-1.5">{[game, mode, map].filter(Boolean).join(' · ')}</p>
        <h3 className="text-[22px] mb-4 group-hover:underline underline-offset-4 decoration-2">{name}</h3>

        <dl className="grid grid-cols-2 border-y border-line">
          <div className="py-2.5 pr-3 border-r border-line">
            <dt className="eyebrow">Entry</dt>
            <dd className="num text-[18px] font-bold mt-0.5">{entryFee === 0 ? 'Free' : rupees(entryFee)}</dd>
          </div>
          <div className="py-2.5 pl-3">
            <dt className="eyebrow">Prize pool</dt>
            <dd className="num text-[18px] font-bold mt-0.5 text-accent">{rupees(prizePool)}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-muted num mb-1.5">
            <span>{joined}/{maxSlots} in</span>
            <span className={left > 0 && left <= 10 ? 'text-live font-semibold' : ''}>
              {left === 0 ? 'Full' : `${left} left`}
            </span>
          </div>
          <div className="h-1 bg-[#ebe8e1]"><div className="h-1 bg-ink" style={{ width: `${fill}%` }} /></div>
        </div>

        <p className="text-[13px] text-muted mt-3 num">{date}{time && ` · ${time}`}</p>
      </div>
    </Link>
  );
};

export default TournamentCard;
