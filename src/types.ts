export interface Team {
  id: number;
  name: string;
}

export interface Station {
  id: string;
  name: string;
  type: 'match' | 'arcade';
}

export interface MatchResult {
  id: number;
  station_id: string;
  station_name: string;
  team_a_id: number;
  team_a_name: string;
  team_b_id?: number | null;
  team_b_name?: string | null;
  winner_id?: number | null;
  winner_name?: string | null;
  is_draw: number;
  score_a: number;
  score_b: number;
  notes?: string;
  created_at: string;
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
