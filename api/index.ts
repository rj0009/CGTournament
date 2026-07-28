import express from 'express';
import {
  getAllTeams,
  updateTeamsList,
  getAllStations,
  submitMatchResult,
  getLeaderboard,
  getRecentMatches,
  deleteMatchResult,
  resetTournamentScores,
} from '../src/db';

const app = express();
app.use(express.json());

app.get('/api/teams', async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json({ success: true, teams });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams)) {
      return res.status(400).json({ success: false, error: 'Expected teams array' });
    }
    const updated = await updateTeamsList(teams);
    res.json({ success: true, teams: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stations', async (req, res) => {
  try {
    const stations = await getAllStations();
    res.json({ success: true, stations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/score', async (req, res) => {
  try {
    const {
      station_id,
      team_a_id,
      team_b_id,
      winner_id,
      is_draw,
      score_a,
      score_b,
      notes,
    } = req.body;

    if (!station_id || !team_a_id) {
      return res.status(400).json({ success: false, error: 'station_id and team_a_id are required' });
    }

    const matchId = await submitMatchResult({
      station_id,
      team_a_id: Number(team_a_id),
      team_b_id: team_b_id ? Number(team_b_id) : null,
      winner_id: winner_id ? Number(winner_id) : null,
      is_draw: Boolean(is_draw),
      score_a: Number(score_a) || 0,
      score_b: Number(score_b) || 0,
      notes: notes || '',
    });

    res.json({ success: true, matchId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({
      success: true,
      leaderboard,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const matches = await getRecentMatches(limit, stationId);
    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID' });
    await deleteMatchResult(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await resetTournamentScores();
    res.json({ success: true, message: 'Tournament scores reset successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
