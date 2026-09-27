import express from 'express';

// Ponteng Work API — all routes proxy to the Jarvis Base44 backend (cgTournament)
// which is the persistent single source of truth for teams + matches.
const BACKEND = 'https://jarvis-4ab907e4.base44.app/functions/cgTournament';

// 5s TTL cache for read actions: the TV leaderboard and every station phone
// poll these continuously on event day; serving repeats from cache keeps the
// Base44 function far below its rate limit. Writes are never cached.
const CACHE_TTL_MS = 5000;
const cache = new Map<string, { t: number; v: unknown }>();

async function call(payload: Record<string, unknown>) {
  const isRead = payload.action === 'teams_get' || payload.action === 'leaderboard' || payload.action === 'stations' || payload.action === 'matches_get' || payload.action === 'rotation_get';
  const key = isRead ? String(payload.action) : '';
  if (isRead) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.v;
  }
  const r = await fetch(BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const v = await r.json();
  if (isRead && v && (v as any).success) {
    if (cache.size > 50) cache.clear();
    cache.set(key, { t: Date.now(), v });
  }
  return v;
}

const app = express();
app.use(express.json());

// Write protection: all non-GET calls must carry the event passcode header.
const EVENT_PASSCODE = process.env.EVENT_PASSCODE || '4321';
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  if (req.get('x-event-passcode') !== EVENT_PASSCODE) {
    return res.status(401).json({ success: false, error: 'Invalid event passcode' });
  }
  next();
});

app.get('/api/teams', async (_req, res) => {
  try {
    res.json(await call({ action: 'teams_get' }));
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
    res.json(await call({ action: 'teams_save', teams }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stations', async (_req, res) => {
  try {
    res.json(await call({ action: 'stations' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/score', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.station_id || !body.team_a_id) {
      return res.status(400).json({ success: false, error: 'station_id and team_a_id are required' });
    }
    const result = await call({
      action: 'score_add',
      match: {
        station_id: body.station_id,
        team_a_id: Number(body.team_a_id),
        team_b_id: body.team_b_id ? Number(body.team_b_id) : 0,
        winner_id: body.winner_id ? Number(body.winner_id) : 0,
        is_draw: Boolean(body.is_draw),
        score_a: Number(body.score_a) || 0,
        score_b: Number(body.score_b) || 0,
        notes: body.notes || '',
      },
    });
    res.json({ success: result?.success === true, matchId: result?.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    res.json(await call({ action: 'leaderboard' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    res.json(await call({
      action: 'matches_get',
      stationId: req.query.stationId ? String(req.query.stationId) : '',
      limit: req.query.limit ? Number(req.query.limit) : 25,
    }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    res.json(await call({ action: 'match_delete', id: String(req.params.id) }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rotation', async (_req, res) => {
  try {
    res.json(await call({ action: 'rotation_get' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rotation', async (req, res) => {
  try {
    const cycle_ms = Number(req.body?.cycle_ms) || 900000;
    res.json(await call({ action: 'rotation_set', cycle_ms }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rotation/pause', async (_req, res) => {
  try {
    res.json(await call({ action: 'rotation_pause' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rotation/resume', async (_req, res) => {
  try {
    res.json(await call({ action: 'rotation_resume' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reset', async (_req, res) => {
  try {
    res.json(await call({ action: 'reset' }));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
