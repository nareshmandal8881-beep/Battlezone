// Mode → maps → team sizes for each game. Admin screens use these as dropdowns.
// A game not listed here falls back to free-text mode/map.
export const GAME_PRESETS = {
  BGMI: {
    Classic: { maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Nusa', 'Karakin'], teams: ['Squad', 'Duo', 'Solo'] },
    TDM: { label: 'TDM — Team Deathmatch', maps: ['Warehouse', 'Hangar', 'Ruins', 'Town', 'Library'], teams: ['4v4', '2v2', '1v1'] },
  },
  PUBG: {
    Classic: { maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Taego', 'Deston', 'Rondo'], teams: ['Squad', 'Duo', 'Solo'] },
    TDM: { label: 'TDM — Team Deathmatch', maps: ['Warehouse', 'Hangar', 'Ruins', 'Town', 'Library'], teams: ['4v4', '2v2', '1v1'] },
  },
  'Free Fire': {
    'Battle Royale': { maps: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NeXTerra'], teams: ['Squad', 'Duo', 'Solo'] },
    'Clash Squad': { maps: ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine'], teams: ['4v4', '2v2', '1v1'] },
    'Lone Wolf': { maps: ['Lone Wolf Arena'], teams: ['1v1', '2v2'] },
  },
  COD: {
    'Battle Royale': { maps: ['Isolated', 'Blackout', 'Alcatraz'], teams: ['Squad', 'Duo', 'Solo'] },
    TDM: { label: 'TDM — Team Deathmatch', maps: ['Nuketown', 'Crash', 'Firing Range', 'Killhouse', 'Summit', 'Standoff'], teams: ['5v5', '4v4', '2v2'] },
    'Search & Destroy': { maps: ['Standoff', 'Crossfire', 'Raid', 'Summit', 'Firing Range'], teams: ['5v5'] },
  },
  Valorant: {
    Competitive: { maps: ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Icebox', 'Breeze'], teams: ['5v5'] },
    'Team Deathmatch': { maps: ['Piazza', 'District', 'Kasbah', 'Drift', 'Glitch'], teams: ['5v5'] },
  },
  Ludo: {
    Classic: { maps: ['2 players', '3 players', '4 players'], teams: ['Solo'] },
  },
};

export const modesFor = (game) => Object.keys(GAME_PRESETS[game] || {});
export const presetFor = (game, mode) => GAME_PRESETS[game]?.[mode];
export const modeLabel = (game, mode) => presetFor(game, mode)?.label || mode;

// Fill mode/map/team with valid defaults when the game (or mode) changes.
export const normalise = (f, changed) => {
  const modes = modesFor(f.game);
  if (!modes.length) return f;
  const mode = changed === 'game' || !modes.includes(f.mode) ? modes[0] : f.mode;
  const p = presetFor(f.game, mode);
  const map = changed === 'game' || changed === 'mode' || !p.maps.includes(f.map) ? p.maps[0] : f.map;
  const teamSize = changed === 'game' || changed === 'mode' || !p.teams.includes(f.teamSize) ? p.teams[0] : f.teamSize;
  return { ...f, mode, map, teamSize };
};
