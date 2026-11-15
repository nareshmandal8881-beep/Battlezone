import React from 'react';
import { modesFor, presetFor, modeLabel, normalise } from '../lib/gameModes';

// Game-aware Mode / Map / Team selects. `value` holds {game, mode, map, teamSize}.
const ModeMapPicker = ({ value, onChange, games }) => {
  const modes = modesFor(value.game);
  const preset = presetFor(value.game, value.mode);
  const pick = (key) => (e) => onChange(normalise({ ...value, [key]: e.target.value }, key));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <label className="field-label">Game</label>
        <select className="field" value={value.game} onChange={pick('game')}>
          {games.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Mode</label>
        {modes.length ? (
          <select className="field" value={value.mode} onChange={pick('mode')}>
            {modes.map((m) => <option key={m} value={m}>{modeLabel(value.game, m)}</option>)}
          </select>
        ) : <input className="field" value={value.mode || ''} onChange={pick('mode')} placeholder="e.g. Squad" />}
      </div>
      <div>
        <label className="field-label">Map</label>
        {preset ? (
          <select className="field" value={value.map} onChange={pick('map')}>
            {preset.maps.map((m) => <option key={m}>{m}</option>)}
          </select>
        ) : <input className="field" value={value.map || ''} onChange={pick('map')} placeholder="e.g. Erangel" />}
      </div>
      <div>
        <label className="field-label">Team</label>
        {preset ? (
          <select className="field" value={value.teamSize} onChange={pick('teamSize')}>
            {preset.teams.map((m) => <option key={m}>{m}</option>)}
          </select>
        ) : <input className="field" value={value.teamSize || ''} onChange={pick('teamSize')} placeholder="e.g. Squad" />}
      </div>
    </div>
  );
};

export default ModeMapPicker;
