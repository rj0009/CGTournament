import fs from 'fs/promises';
import path from 'path';

export interface Team {
  id: number;
  name: string;
}

export interface Station {
  id: string;
  name: string;
  type: string; // 'match' | 'arcade'
}

export interface StoredMatch {
  id: number;
  station_id: string;
  team_a_id: number;
  team_b_id: number | null;
  winner_id: number | null;
  is_draw: number;
  score_a: number;
  score_b: number;
  notes: string;
  created_at: string;
}

export interface DbSchema {
  teams: Team[];
  stations: Station[];
  match_results: StoredMatch[];
  next_match_id: number;
}

export interface MatchResultInput {
  station_id: string;
  team_a_id: number;
  team_b_id?: number | null;
  winner_id?: number | null;
  is_draw?: boolean;
  score_a?: number;
  score_b?: number;
  notes?: string;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  arcade_score: number;
  rank: number;
}

const DB_FILE_PATH = path.resolve(process.cwd(), 'tournament.json');

const DEFAULT_TEAMS: Team[] = [
  { id: 1, name: 'Red Dragons' },
  { id: 2, name: 'Blue Falcons' },
  { id: 3, name: 'Golden Eagles' },
  { id: 4, name: 'Silver Panthers' },
  { id: 5, name: 'Green Vipers' },
  { id: 6, name: 'Purple Storm' },
  { id: 7, name: 'White Tigers' },
  { id: 8, name: 'Black Mambas' },
];

const DEFAULT_STATIONS: Station[] = [
  { id: 'foosball', name: 'Foosball', type: 'match' },
  { id: 'pool', name: 'Pool Table', type: 'match' },
  { id: 'darts', name: 'Darts', type: 'match' },
  { id: 'basketball', name: 'Basketball Machine', type: 'arcade' },
];

let cachedData: DbSchema | null = null;

async function loadDb(): Promise<DbSchema> {
  if (cachedData) return cachedData;

  try {
    const raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
    cachedData = JSON.parse(raw);
    return cachedData!;
  } catch {
    cachedData = {
      teams: DEFAULT_TEAMS,
      stations: DEFAULT_STATIONS,
      match_results: [],
      next_match_id: 1,
    };
    await saveDb(cachedData);
    return cachedData;
  }
}

async function saveDb(data: DbSchema): Promise<void> {
  cachedData = data;
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getDb() {
  return await loadDb();
}

export async function getAllTeams(): Promise<Team[]> {
  const db = await loadDb();
  return db.teams;
}

export async function updateTeamsList(names: string[]): Promise<Team[]> {
  const db = await loadDb();
  const validNames = names.map(n => n.trim()).filter(n => n.length > 0);
  if (validNames.length === 0) {
    throw new Error('Team list cannot be empty');
  }

  if (validNames.length === db.teams.length) {
    db.teams = db.teams.map((team, idx) => ({
      ...team,
      name: validNames[idx],
    }));
  } else {
    db.match_results = [];
    db.teams = validNames.map((name, idx) => ({
      id: idx + 1,
      name,
    }));
  }

  await saveDb(db);
  return db.teams;
}

export async function getAllStations(): Promise<Station[]> {
  const db = await loadDb();
  return db.stations;
}

export async function submitMatchResult(input: MatchResultInput): Promise<number> {
  const db = await loadDb();
  const newId = db.next_match_id;

  const newMatch: StoredMatch = {
    id: newId,
    station_id: input.station_id,
    team_a_id: input.team_a_id,
    team_b_id: input.team_b_id ?? null,
    winner_id: input.winner_id ?? null,
    is_draw: input.is_draw ? 1 : 0,
    score_a: Number(input.score_a) || 0,
    score_b: Number(input.score_b) || 0,
    notes: input.notes || '',
    created_at: new Date().toISOString(),
  };

  db.match_results.push(newMatch);
  db.next_match_id += 1;

  await saveDb(db);
  return newId;
}

export async function deleteMatchResult(id: number): Promise<void> {
  const db = await loadDb();
  db.match_results = db.match_results.filter(m => m.id !== id);
  await saveDb(db);
}

export async function resetTournamentScores(): Promise<void> {
  const db = await loadDb();
  db.match_results = [];
  await saveDb(db);
}

export async function getRecentMatches(limit = 25, stationId?: string) {
  const db = await loadDb();
  const teamMap = new Map<number, string>(db.teams.map(t => [t.id, t.name]));
  const stationMap = new Map<string, string>(db.stations.map(s => [s.id, s.name]));

  let filtered = [...db.match_results];
  if (stationId) {
    filtered = filtered.filter(m => m.station_id === stationId);
  }

  filtered.sort((a, b) => b.id - a.id);
  const sliced = filtered.slice(0, limit);

  return sliced.map(m => ({
    id: m.id,
    station_id: m.station_id,
    station_name: stationMap.get(m.station_id) || m.station_id,
    team_a_id: m.team_a_id,
    team_a_name: teamMap.get(m.team_a_id) || 'Unknown Team',
    team_b_id: m.team_b_id,
    team_b_name: m.team_b_id ? teamMap.get(m.team_b_id) || 'Unknown Team' : null,
    winner_id: m.winner_id,
    winner_name: m.winner_id ? teamMap.get(m.winner_id) || 'Unknown Team' : null,
    is_draw: m.is_draw,
    score_a: m.score_a,
    score_b: m.score_b,
    notes: m.notes,
    created_at: m.created_at,
  }));
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const db = await loadDb();
  const statsMap = new Map<number, {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    arcade_score: number;
  }>();

  for (const team of db.teams) {
    statsMap.set(team.id, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      arcade_score: 0,
    });
  }

  for (const m of db.match_results) {
    if (m.team_a_id && statsMap.has(m.team_a_id)) {
      const statsA = statsMap.get(m.team_a_id)!;
      statsA.played += 1;
      statsA.arcade_score += (m.score_a || 0);

      if (m.is_draw === 1) {
        statsA.draws += 1;
        statsA.points += 1;
      } else if (m.winner_id === m.team_a_id) {
        statsA.wins += 1;
        statsA.points += 3;
      } else if (m.winner_id && m.winner_id !== m.team_a_id) {
        statsA.losses += 1;
      }
    }

    if (m.team_b_id && statsMap.has(m.team_b_id)) {
      const statsB = statsMap.get(m.team_b_id)!;
      statsB.played += 1;
      statsB.arcade_score += (m.score_b || 0);

      if (m.is_draw === 1) {
        statsB.draws += 1;
        statsB.points += 1;
      } else if (m.winner_id === m.team_b_id) {
        statsB.wins += 1;
        statsB.points += 3;
      } else if (m.winner_id && m.winner_id !== m.team_b_id) {
        statsB.losses += 1;
      }
    }
  }

  const resultList: LeaderboardEntry[] = db.teams.map(team => {
    const stats = statsMap.get(team.id) || {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      arcade_score: 0,
    };
    return {
      id: team.id,
      name: team.name,
      played: stats.played,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      points: stats.points,
      arcade_score: stats.arcade_score,
      rank: 0,
    };
  });

  resultList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.arcade_score !== a.arcade_score) return b.arcade_score - a.arcade_score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  resultList.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return resultList;
}
