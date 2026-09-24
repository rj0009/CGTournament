import { Team, Station, LeaderboardEntry, MatchResult } from '../types';

export const DEFAULT_TEAMS: Team[] = [
  { id: 1, name: 'Red Dragons' },
  { id: 2, name: 'Blue Falcons' },
  { id: 3, name: 'Golden Eagles' },
  { id: 4, name: 'Silver Panthers' },
  { id: 5, name: 'Green Vipers' },
  { id: 6, name: 'Purple Storm' },
  { id: 7, name: 'White Tigers' },
  { id: 8, name: 'Black Mambas' },
];

export const DEFAULT_STATIONS: Station[] = [
  { id: 'foosball', name: 'Foosball', type: 'match' },
  { id: 'pool', name: 'Pool Table', type: 'match' },
  { id: 'darts', name: 'Darts', type: 'match' },
  { id: 'basketball', name: 'Basketball Machine', type: 'arcade' },
];

interface StoredMatch {
  id: number;
  station_id: string;
  team_a_id: number;
  team_b_id: number | null;
  winner_id: number | null;
  is_draw: boolean;
  score_a: number;
  score_b: number;
  notes: string;
  created_at: string;
}

// Helper to safely parse JSON responses
async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.toLowerCase().includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn(`Fetch to ${url} failed, falling back to local storage:`, err);
  }
  return null;
}

// Local storage helpers
function getLocalTeams(): Team[] {
  try {
    const raw = localStorage.getItem('ncss_teams');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading local teams:', err);
  }
  localStorage.setItem('ncss_teams', JSON.stringify(DEFAULT_TEAMS));
  return DEFAULT_TEAMS;
}

function saveLocalTeams(teams: Team[]) {
  localStorage.setItem('ncss_teams', JSON.stringify(teams));
}

function getLocalMatches(): StoredMatch[] {
  try {
    const raw = localStorage.getItem('ncss_matches');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading local matches:', err);
  }
  return [];
}

function saveLocalMatches(matches: StoredMatch[]) {
  localStorage.setItem('ncss_matches', JSON.stringify(matches));
}

// API Methods
export async function getTeams(): Promise<Team[]> {
  const data = await safeFetch<{ success: boolean; teams: Team[] }>('/api/teams');
  if (data?.success && Array.isArray(data.teams) && data.teams.length > 0) {
    saveLocalTeams(data.teams);
    return data.teams;
  }
  return getLocalTeams();
}

export async function saveTeams(names: (string | { name: string; lead?: string })[]): Promise<Team[]> {
  const items = names
    .map(n => (typeof n === 'string' ? { name: n.trim(), lead: '' } : { name: (n.name || '').trim(), lead: (n.lead || '').trim() }))
    .filter(n => n.name.length > 0);
  if (items.length === 0) throw new Error('At least one team name is required');

  const data = await safeFetch<{ success: boolean; teams: Team[]; error?: string }>('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teams: items }),
  });

  if (data?.success && Array.isArray(data.teams)) {
    saveLocalTeams(data.teams);
    return data.teams;
  }

  // Local fallback
  const newTeams: Team[] = items.map((t, index) => ({
    id: index + 1,
    name: t.name,
    lead: t.lead,
  }));
  saveLocalTeams(newTeams);
  return newTeams;
}

export async function getStations(): Promise<Station[]> {
  const data = await safeFetch<{ success: boolean; stations: Station[] }>('/api/stations');
  if (data?.success && Array.isArray(data.stations)) {
    return data.stations;
  }
  return DEFAULT_STATIONS;
}

export async function submitScore(input: {
  station_id: string;
  team_a_id: number;
  team_b_id: number | null;
  winner_id: number | null;
  is_draw: boolean;
  score_a: number;
  score_b: number;
  notes: string;
}): Promise<boolean> {
  const data = await safeFetch<{ success: boolean; matchId?: number; error?: string }>('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (data?.success) return true;

  // Local storage fallback
  const matches = getLocalMatches();
  const nextId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) + 1 : 1;
  const newMatch: StoredMatch = {
    id: nextId,
    ...input,
    created_at: new Date().toISOString(),
  };
  matches.push(newMatch);
  saveLocalMatches(matches);
  return true;
}

export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[]; lastUpdated: string }> {
  const data = await safeFetch<{ success: boolean; leaderboard: LeaderboardEntry[]; lastUpdated: string }>('/api/leaderboard');
  if (data?.success && Array.isArray(data.leaderboard)) {
    return { leaderboard: data.leaderboard, lastUpdated: data.lastUpdated };
  }

  // Local calculation fallback
  const teams = getLocalTeams();
  const matches = getLocalMatches();

  const statsMap = new Map<number, {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    arcade_score: number;
  }>();

  teams.forEach(t => {
    statsMap.set(t.id, { played: 0, wins: 0, draws: 0, losses: 0, points: 0, arcade_score: 0 });
  });

  matches.forEach(m => {
    if (m.team_a_id && statsMap.has(m.team_a_id)) {
      const s = statsMap.get(m.team_a_id)!;
      s.played += 1;
      s.arcade_score += (m.score_a || 0);
      if (m.is_draw) {
        s.draws += 1;
        s.points += 1;
      } else if (m.winner_id === m.team_a_id) {
        s.wins += 1;
        s.points += 3;
      } else if (m.winner_id && m.winner_id !== m.team_a_id) {
        s.losses += 1;
      }
    }

    if (m.team_b_id && statsMap.has(m.team_b_id)) {
      const s = statsMap.get(m.team_b_id)!;
      s.played += 1;
      s.arcade_score += (m.score_b || 0);
      if (m.is_draw) {
        s.draws += 1;
        s.points += 1;
      } else if (m.winner_id === m.team_b_id) {
        s.wins += 1;
        s.points += 3;
      } else if (m.winner_id && m.winner_id !== m.team_b_id) {
        s.losses += 1;
      }
    }
  });

  const list: LeaderboardEntry[] = teams.map(t => {
    const s = statsMap.get(t.id) || { played: 0, wins: 0, draws: 0, losses: 0, points: 0, arcade_score: 0 };
    return {
      id: t.id,
      name: t.name,
      ...s,
      rank: 0,
    };
  });

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.arcade_score !== a.arcade_score) return b.arcade_score - a.arcade_score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return { leaderboard: list, lastUpdated: new Date().toISOString() };
}

export async function getMatches(stationId?: string, limit = 25): Promise<MatchResult[]> {
  const url = stationId ? `/api/matches?stationId=${stationId}&limit=${limit}` : `/api/matches?limit=${limit}`;
  const data = await safeFetch<{ success: boolean; matches: MatchResult[] }>(url);
  if (data?.success && Array.isArray(data.matches)) {
    return data.matches;
  }

  // Local fallback
  const teams = getLocalTeams();
  const teamMap = new Map<number, string>(teams.map(t => [t.id, t.name]));
  const stationMap = new Map<string, string>(DEFAULT_STATIONS.map(s => [s.id, s.name]));

  let localMatches = getLocalMatches();
  if (stationId) {
    localMatches = localMatches.filter(m => m.station_id === stationId);
  }

  localMatches.sort((a, b) => b.id - a.id);
  const sliced = localMatches.slice(0, limit);

  return sliced.map(m => ({
    id: m.id,
    station_id: m.station_id,
    station_name: stationMap.get(m.station_id) || m.station_id,
    team_a_id: m.team_a_id,
    team_a_name: teamMap.get(m.team_a_id) || 'Team ' + m.team_a_id,
    team_b_id: m.team_b_id,
    team_b_name: m.team_b_id ? (teamMap.get(m.team_b_id) || 'Team ' + m.team_b_id) : null,
    winner_id: m.winner_id,
    winner_name: m.winner_id ? (teamMap.get(m.winner_id) || 'Team ' + m.winner_id) : null,
    is_draw: m.is_draw ? 1 : 0,
    score_a: m.score_a,
    score_b: m.score_b,
    notes: m.notes,
    created_at: m.created_at,
  }));
}

export async function deleteMatch(id: number): Promise<boolean> {
  const data = await safeFetch<{ success: boolean }>(`/api/matches/${id}`, { method: 'DELETE' });
  if (data?.success) return true;

  const matches = getLocalMatches().filter(m => m.id !== id);
  saveLocalMatches(matches);
  return true;
}

export async function resetScores(): Promise<boolean> {
  const data = await safeFetch<{ success: boolean }>(`/api/reset`, { method: 'POST' });
  if (data?.success) return true;

  saveLocalMatches([]);
  return true;
}
