import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, MatchResult } from '../types';
import { Trophy, RefreshCw, Flame, Gamepad2, Sparkles } from 'lucide-react';
import { getLeaderboard, getMatches } from '../services/api';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState<number>(5);

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [lbData, matches] = await Promise.all([
        getLeaderboard(),
        getMatches(undefined, 10)
      ]);

      if (lbData) {
        setLeaderboard(lbData.leaderboard);
        setLastUpdated(lbData.lastUpdated);
      }
      if (matches) {
        setRecentMatches(matches);
      }
    } catch (err) {
      console.error('Error polling leaderboard:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      setSecondsUntilNextRefresh(5);
    }
  };

  // 5-second polling interval
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    const timer = setInterval(() => {
      setSecondsUntilNextRefresh(prev => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const formatRankNumber = (rank: number) => {
    return rank < 10 ? `0${rank}` : `${rank}`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-4xl md:text-5xl font-black italic text-yellow-400 drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)]';
    if (rank === 2) return 'text-3xl md:text-4xl font-black italic text-zinc-300';
    if (rank === 3) return 'text-3xl md:text-4xl font-black italic text-amber-600';
    return 'text-2xl font-black italic text-zinc-600';
  };

  const getRowStyle = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-yellow-500/10 via-zinc-900 to-zinc-950 border-y-2 border-yellow-500/50';
    }
    if (rank === 2) {
      return 'bg-zinc-900/40 border-b border-zinc-800/80';
    }
    if (rank === 3) {
      return 'bg-zinc-900/20 border-b border-zinc-800/60';
    }
    return 'border-b border-zinc-900 hover:bg-zinc-900/30';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 lg:p-8 font-sans selection:bg-yellow-400 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Hero Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] bg-yellow-400 text-black rounded">
                NCSS CG Standings
              </span>
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-mono font-bold uppercase tracking-widest">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span>Polling Live</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl leading-none font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-zinc-500">
              NCSS CG Tournament
            </h1>
            <p className="text-zinc-500 font-mono text-xs sm:text-sm mt-2 tracking-widest uppercase">
              NCSS Corporate Group Fun Activities • Multi-Station Venue Event • Win=3PTS | Draw=1PT
            </p>
          </div>

          {/* Clock & Status */}
          <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-5 py-3 rounded-lg shrink-0">
            <div className="text-right font-mono">
              <div className="text-2xl font-bold tracking-tight text-yellow-400 tabular-nums">
                {secondsUntilNextRefresh}s <span className="text-xs text-zinc-500 uppercase font-sans font-normal">Next Poll</span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Connecting...'}
              </div>
            </div>

            <button
              onClick={fetchData}
              disabled={isSyncing}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-all disabled:opacity-50 cursor-pointer border border-zinc-700"
              title="Force Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-yellow-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Grid: Leaderboard + Station Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEADERBOARD TABLE (Col 8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
              
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs uppercase font-black tracking-[0.15em] text-zinc-500 border-b border-zinc-800 bg-zinc-900/60">
                <div className="col-span-2 sm:col-span-1">Rank</div>
                <div className="col-span-5 sm:col-span-5">Team Identity</div>
                <div className="col-span-1 text-center font-mono">GP</div>
                <div className="col-span-2 sm:col-span-3 text-center font-mono">W / D / L</div>
                <div className="col-span-2 text-right">Points</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-zinc-900">
                {isLoading ? (
                  <div className="py-16 text-center text-zinc-500 font-mono text-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-400 mb-3" />
                    FETCHING LIVE LEADERBOARD DATA...
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 font-mono text-sm">
                    NO TEAMS FOUND. CONFIGURE TEAMS IN SETUP.
                  </div>
                ) : (
                  leaderboard.map(team => (
                    <div
                      key={team.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-4 sm:py-5 items-center transition-colors ${getRowStyle(team.rank)}`}
                    >
                      {/* Rank */}
                      <div className={`col-span-2 sm:col-span-1 font-mono tracking-tighter ${getRankStyle(team.rank)}`}>
                        {formatRankNumber(team.rank)}
                      </div>

                      {/* Team Name */}
                      <div className="col-span-5 sm:col-span-5">
                        <div className="text-lg sm:text-2xl font-extrabold tracking-tight uppercase text-white flex items-center gap-2">
                          {team.rank === 1 && (
                            <Trophy className="w-5 h-5 text-yellow-400 shrink-0 inline" />
                          )}
                          <span className="truncate">[Team {team.id}] {team.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                          Tiebreaker: {team.arcade_score.toLocaleString()} PTS
                        </div>
                      </div>

                      {/* Played */}
                      <div className="col-span-1 text-center font-mono text-base sm:text-xl font-bold text-zinc-300">
                        {team.played}
                      </div>

                      {/* W / D / L */}
                      <div className="col-span-2 sm:col-span-3 text-center font-mono text-xs sm:text-lg text-zinc-400 font-bold">
                        <span className="text-emerald-400">{team.wins}</span> / <span className="text-yellow-400">{team.draws}</span> / <span className="text-rose-400">{team.losses}</span>
                      </div>

                      {/* Total Points */}
                      <div className="col-span-2 text-right">
                        <span className={`text-3xl sm:text-5xl font-black italic tracking-tighter ${
                          team.rank === 1 ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {team.points}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block font-normal">PTS</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Rules Banner */}
            <div className="p-4 border border-zinc-800/80 bg-zinc-950 rounded-lg text-xs font-mono text-zinc-500 flex flex-wrap items-center justify-between gap-2 uppercase tracking-wider">
              <span>Standard Win: 3 PTS • Draw: 1 PT • Loss: 0 PTS</span>
              <span>Tiebreaker: Arcade Challenge Points</span>
            </div>
          </div>

          {/* STATION ACTIVITY & QUICK INFO (Col 4) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Live Station Activity */}
            <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-lg shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-yellow-400" />
                  Station Feed
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Realtime Stream</span>
              </div>

              <div className="space-y-3">
                {recentMatches.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 font-mono text-xs">
                    No results recorded yet.
                  </div>
                ) : (
                  recentMatches.slice(0, 5).map(m => (
                    <div
                      key={m.id}
                      className="p-3 bg-black/60 border border-zinc-800 rounded flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-yellow-400 font-bold uppercase tracking-wider">
                          {m.station_name}
                        </div>
                        <div className="font-bold text-zinc-100 text-sm">
                          {m.is_draw === 1 ? (
                            <span className="text-yellow-300">
                              DRAW: {m.team_a_name} vs {m.team_b_name}
                            </span>
                          ) : m.winner_name ? (
                            <span>
                              <span className="text-emerald-400">{m.winner_name}</span> WON
                              {m.team_b_name && (
                                <span className="text-zinc-500 font-normal text-xs ml-1">
                                  vs {m.winner_id === m.team_a_id ? m.team_b_name : m.team_a_name}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>{m.team_a_name}: {m.score_a} pts</span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-500 text-right shrink-0">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Station Master Info Banner */}
            <div className="p-6 bg-yellow-400 text-black rounded-lg shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Station Master Link</h3>
              </div>
              <p className="text-xs font-bold leading-snug">
                Access your game station scoring interface from your phone browser:
              </p>
              <code className="block bg-black text-yellow-400 p-2 text-xs font-mono rounded font-bold uppercase tracking-wider">
                /station/[station-name]
              </code>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['foosball', 'pool', 'darts', 'basketball'].map(st => (
                  <span key={st} className="px-2 py-0.5 bg-black/10 text-[10px] font-black uppercase tracking-wider rounded">
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Tiebreaker Arcade Banner */}
            <div className="p-5 border-2 border-dashed border-zinc-800 bg-zinc-950 rounded-lg text-center space-y-1">
              <div className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Arcade Challenge Tiebreaker
              </div>
              <div className="text-xs text-zinc-400">
                High scores entered at Arcade stations break ties for top ranks!
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
