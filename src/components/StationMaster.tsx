import React, { useEffect, useState } from 'react';
import { Station, Team, MatchResult } from '../types';
import { Gamepad2, CheckCircle2, Trash2, Trophy, Dices, Target, Flame, Activity, Sparkles, Send, RefreshCw, Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { getStations, getTeams, getMatches, submitScore, deleteMatch } from '../services/api';

interface StationMasterProps {
  stationId: string;
  onNavigate: (path: string) => void;
}

export const StationMaster: React.FC<StationMasterProps> = ({ stationId, onNavigate }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recentStationMatches, setRecentStationMatches] = useState<MatchResult[]>([]);

  // Form State
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const [outcome, setOutcome] = useState<'a_win' | 'draw' | 'b_win'>('a_win');
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerDuration = stationId === 'pool' ? 720 : 180;
  const hasStationTimer = stationId === 'foosball' || stationId === 'pool';
  const [roundSeconds, setRoundSeconds] = useState(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

  const currentStation = stations.find(s => s.id === stationId) || {
    id: stationId,
    name: stationId.toUpperCase(),
    type: stationId === 'basketball' ? 'arcade' : 'match',
  };

  const getStationIcon = (id: string) => {
    switch (id) {
      case 'foosball': return Dices;
      case 'pool': return Target;
      case 'darts': return Flame;
      case 'basketball': return Activity;
      case 'soccer': return Gamepad2;
      default: return Gamepad2;
    }
  };

  const IconComponent = getStationIcon(stationId);

  // Fetch stations & teams
  const loadInitialData = async () => {
    try {
      const [fetchedStations, fetchedTeams] = await Promise.all([
        getStations(),
        getTeams()
      ]);

      if (fetchedStations) setStations(fetchedStations);
      if (fetchedTeams && fetchedTeams.length > 0) {
        setTeams(fetchedTeams);
        setTeamAId(String(fetchedTeams[0].id));
        if (fetchedTeams.length >= 2) {
          setTeamBId(String(fetchedTeams[1].id));
        } else {
          setTeamBId('');
        }
      }
    } catch (err) {
      console.error('Failed to load station data:', err);
    }
  };

  // Fetch recent matches for this specific station
  const loadStationMatches = async () => {
    try {
      const matches = await getMatches(stationId, 10);
      setRecentStationMatches(matches);
    } catch (err) {
      console.error('Failed to load station matches:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadStationMatches();
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [stationId]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = window.setInterval(() => {
      setRoundSeconds(seconds => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTimerRunning]);

  const resetRoundTimer = () => {
    setIsTimerRunning(false);
    setRoundSeconds(timerDuration);
  };

  const advanceRound = () => {
    setIsTimerRunning(false);
    setRoundNumber(round => Math.min(3, round + 1));
    setRoundSeconds(timerDuration);
  };

  const formattedRoundTime = `${Math.floor(roundSeconds / 60)}:${String(roundSeconds % 60).padStart(2, '0')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const isArcade = currentStation.type === 'arcade';

    if (!teamAId) {
      setErrorMessage('Please select Team A');
      return;
    }

    if (!isArcade && teamAId === teamBId) {
      setErrorMessage('Team A and Team B must be different');
      return;
    }

    setIsSubmitting(true);

    try {
      let winner_id: number | null = null;
      let is_draw = false;

      if (!isArcade) {
        if (outcome === 'a_win') {
          winner_id = Number(teamAId);
        } else if (outcome === 'b_win') {
          winner_id = Number(teamBId);
        } else {
          is_draw = true;
        }
      } else {
        if (Number(scoreA) > Number(scoreB)) {
          winner_id = Number(teamAId);
        } else if (Number(scoreB) > Number(scoreA)) {
          winner_id = Number(teamBId);
        } else {
          is_draw = true;
        }
      }

      const payload = {
        station_id: stationId,
        team_a_id: Number(teamAId),
        team_b_id: isArcade && !teamBId ? null : Number(teamBId),
        winner_id,
        is_draw,
        score_a: Number(scoreA) || 0,
        score_b: Number(scoreB) || 0,
        notes,
      };

      await submitScore(payload);
      setSuccessMessage('Match result recorded!');
      setScoreA(0);
      setScoreB(0);
      setNotes('');
      loadStationMatches();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting score');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!confirm('Are you sure you want to delete this score entry?')) return;
    try {
      await deleteMatch(matchId);
      setSuccessMessage('Score entry deleted.');
      loadStationMatches();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const isArcadeMode = currentStation.type === 'arcade';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Station Navigation Header */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-yellow-400 text-black font-black rounded shrink-0">
                <IconComponent className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-white">
                    {currentStation.name}
                  </h1>
                  <span className="text-[10px] px-2.5 py-0.5 rounded font-black tracking-widest uppercase bg-zinc-800 text-yellow-400 border border-zinc-700">
                    Station Master
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-wider">
                  Direct Station URL: <code className="text-yellow-400 font-bold">/station/{stationId}</code>
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('/leaderboard')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-xs font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Station Switcher Bar */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0 mr-1">
              Switch Station:
            </span>
            {stations.map(st => {
              const StIcon = getStationIcon(st.id);
              const isActive = st.id === stationId;
              return (
                <button
                  key={st.id}
                  onClick={() => onNavigate(`/station/${st.id}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-yellow-400 text-black font-black shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <StIcon className="w-3.5 h-3.5" />
                  <span>{st.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {hasStationTimer && (
          <section className="bg-zinc-950 border border-yellow-400/30 p-5 rounded-lg shadow-xl" aria-labelledby="station-timer-heading">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Timer className="w-5 h-5" />
                  <h2 id="station-timer-heading" className="text-sm font-black uppercase tracking-widest">{stationId === 'pool' ? 'Pool Table Station Timer' : 'Foosball Station Rules'}</h2>
                </div>
                <p className="mt-2 text-xs font-mono text-zinc-400 uppercase tracking-wide">
                  {stationId === 'pool' ? '12 minute station timer' : '3 rounds total · Best of 3 matches wins the station · 3 minutes per round'}
                </p>
                {stationId === 'foosball' && <p className="mt-2 text-xs font-mono text-zinc-500">Round {roundNumber} of 3</p>}
              </div>

              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <div className={`font-mono text-4xl font-black tabular-nums ${roundSeconds === 0 ? 'text-red-400' : 'text-white'}`} aria-live="polite">
                  {formattedRoundTime}
                </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">{stationId === 'pool' ? 'Station stopwatch' : 'Round stopwatch'}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(running => !running)}
                disabled={roundSeconds === 0}
                className="inline-flex items-center gap-2 rounded bg-yellow-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={resetRoundTimer}
                className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-zinc-500"
              >
                <RotateCcw className="w-4 h-4" />
                Reset round
              </button>
              {stationId === 'foosball' && <button
                type="button"
                onClick={advanceRound}
                disabled={roundNumber === 3}
                className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next round
              </button>}
            </div>
          </section>
        )}

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Entry Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-lg shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-yellow-400" />
              Record Official Game Result
            </h2>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              {isArcadeMode ? 'Numeric Score Entry' : 'Match Scoring'}
            </span>
          </div>

          {/* Team Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                Team A (Primary)
              </label>
              <select
                value={teamAId}
                onChange={e => setTeamAId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-extrabold uppercase focus:outline-none focus:border-yellow-400 text-base"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id} disabled={String(t.id) === teamBId}>
                    [Team {t.id}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                Team B {isArcadeMode && <span className="text-zinc-600">(Optional)</span>}
              </label>
              <select
                value={teamBId}
                onChange={e => setTeamBId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-extrabold uppercase focus:outline-none focus:border-yellow-400 text-base"
              >
                {isArcadeMode && <option value="">None (Solo Score)</option>}
                {teams.map(t => (
                  <option key={t.id} value={t.id} disabled={String(t.id) === teamAId}>
                    [Team {t.id}] {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Match Outcome / Score Input */}
          {!isArcadeMode ? (
            <div className="space-y-3">
              <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                {stationId === 'foosball' ? 'Station Result' : 'Match Result (Win = 3 PTS, Draw = 1 PT)'}
              </label>
              {stationId === 'foosball' && (
                <p className="text-xs font-mono text-zinc-500">
                  After all 3 rounds, select only Win or Lose. Foosball is best of 3, so there should be no draw.
                </p>
              )}
              <div className={`grid gap-3 ${stationId === 'foosball' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button
                  type="button"
                  onClick={() => setOutcome('a_win')}
                  className={`p-4 rounded border text-center transition-all cursor-pointer font-black uppercase ${
                    outcome === 'a_win'
                      ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-base truncate">
                    {teams.find(t => String(t.id) === teamAId)?.name || 'Team A'}
                  </div>
                  <div className="text-[10px] font-mono tracking-widest mt-1">WIN (3 PTS)</div>
                </button>

                {stationId !== 'foosball' && (
                  <button
                    type="button"
                    onClick={() => setOutcome('draw')}
                    className={`p-4 rounded border text-center transition-all cursor-pointer font-black uppercase ${
                      outcome === 'draw'
                        ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-base">DRAW</div>
                    <div className="text-[10px] font-mono tracking-widest mt-1">1 PT EACH</div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOutcome('b_win')}
                  className={`p-4 rounded border text-center transition-all cursor-pointer font-black uppercase ${
                    outcome === 'b_win'
                      ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-base truncate">
                    {teams.find(t => String(t.id) === teamBId)?.name || 'Team B'}
                  </div>
                  <div className="text-[10px] font-mono tracking-widest mt-1">WIN (3 PTS)</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  {teams.find(t => String(t.id) === teamAId)?.name || 'Team A'} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreA}
                  onChange={e => setScoreA(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-mono font-bold text-2xl focus:outline-none focus:border-yellow-400"
                  placeholder="0"
                />
              </div>

              {teamBId && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    {teams.find(t => String(t.id) === teamBId)?.name || 'Team B'} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={e => setScoreB(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white font-mono font-bold text-2xl focus:outline-none focus:border-yellow-400"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {/* Tiebreaker Arcade Challenge score entry */}
          {isArcadeMode && (
          <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Arcade Tiebreaker Points</span>
            </div>
            <p className="text-xs text-zinc-400">
              Numeric points recorded here update the team's tiebreaker tally.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase block mb-1">
                  {teams.find(t => String(t.id) === teamAId)?.name || 'Team A'} Arcade Score:
                </span>
                <input
                  type="number"
                  min="0"
                  value={scoreA}
                  onChange={e => setScoreA(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:border-yellow-400"
                  placeholder="0"
                />
              </div>

              {teamBId && (
                <div>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase block mb-1">
                    {teams.find(t => String(t.id) === teamBId)?.name || 'Team B'} Arcade Score:
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={e => setScoreB(Number(e.target.value))}
                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:border-yellow-400"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              Match Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Sudden death overtime finish"
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-lg rounded shadow-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Score Entry</span>
              </>
            )}
          </button>
        </form>

        {/* Recent Station Submissions */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">
              Recent Submissions @ {currentStation.name}
            </h3>
            <button
              onClick={loadStationMatches}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-900 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {recentStationMatches.length === 0 ? (
              <p className="text-xs font-mono text-zinc-600 py-4 text-center border border-dashed border-zinc-900 rounded">
                NO SCORES RECORDED AT THIS STATION YET.
              </p>
            ) : (
              recentStationMatches.map(m => (
                <div
                  key={m.id}
                  className="bg-zinc-900/80 border border-zinc-800 p-3 rounded flex items-center justify-between gap-4 text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white text-sm uppercase">
                      {m.is_draw === 1 ? (
                        <span className="text-yellow-400">{m.team_a_name} DRAW vs {m.team_b_name}</span>
                      ) : m.winner_name ? (
                        <span>
                          <span className="text-emerald-400">{m.winner_name}</span> WON
                          {m.team_b_name && (
                            <span className="text-zinc-500 font-normal text-xs ml-1">
                              (vs {m.winner_id === m.team_a_id ? m.team_b_name : m.team_a_name})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>{m.team_a_name}: {m.score_a} pts</span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString()} {m.notes ? `• ${m.notes}` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMatch(m.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
