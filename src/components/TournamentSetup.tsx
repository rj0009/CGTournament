import React, { useEffect, useState } from 'react';
import { Team } from '../types';
import { Settings, Save, RotateCcw, Shield, CheckCircle2, AlertTriangle, RefreshCw, Plus, Trash2, ListRestart } from 'lucide-react';
import { getTeams, saveTeams, resetScores, DEFAULT_TEAMS } from '../services/api';

interface TournamentSetupProps {
  onNavigate: (path: string) => void;
}

export const TournamentSetup: React.FC<TournamentSetupProps> = ({ onNavigate }) => {
  const [teams, setTeams] = useState<{ name: string; lead: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTeamsData = async () => {
    setIsLoading(true);
    try {
      const fetched = await getTeams();
      if (fetched && fetched.length > 0) {
        setTeams(fetched.map((t: Team) => ({ name: t.name, lead: t.lead || '' })));
      } else {
        setTeams(DEFAULT_TEAMS.map(t => ({ name: t.name, lead: '' })));
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setTeams(DEFAULT_TEAMS.map(t => ({ name: t.name, lead: '' })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamsData();
  }, []);

  const handleTeamChange = (index: number, value: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], name: value };
    setTeams(updated);
  };

  const handleLeadChange = (index: number, value: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], lead: value };
    setTeams(updated);
  };

  const handleAddTeam = () => {
    setTeams([...teams, { name: `Team ${teams.length + 1}`, lead: '' }]);
  };

  const handleRemoveTeam = (index: number) => {
    if (teams.length <= 1) {
      setMessage({ type: 'error', text: 'Tournament must have at least 1 team' });
      return;
    }
    const updated = teams.filter((_, idx) => idx !== index);
    setTeams(updated);
  };

  const handleRestoreDefaults = () => {
    setTeams(DEFAULT_TEAMS.map(t => ({ name: t.name, lead: '' })));
    setMessage({ type: 'success', text: 'Restored default NCSS CG 8 teams to input fields. Click Save to apply.' });
  };

  const handleSaveTeams = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const validTeams = teams
      .map(t => ({ name: t.name.trim(), lead: t.lead.trim() }))
      .filter(t => t.name);
    if (validTeams.length === 0) {
      setMessage({ type: 'error', text: 'Please fill in at least one team name' });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await saveTeams(validTeams);
      setTeams(updated.map((t: Team) => ({ name: t.name, lead: t.lead || '' })));
      setMessage({ type: 'success', text: `Saved ${updated.length} team names successfully!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving team names' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTournament = async () => {
    setIsResetting(true);
    setMessage(null);
    try {
      await resetScores();
      setMessage({ type: 'success', text: 'Tournament scores reset! Team names preserved.' });
      setShowResetConfirm(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error resetting scores' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-400 text-black font-black rounded shrink-0">
              <Settings className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                NCSS CG Tournament Setup
              </h1>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                Configure Team Roster ({teams.length} Teams) • Manage Scores
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/leaderboard')}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-xs rounded transition-colors cursor-pointer shrink-0"
          >
            Go to Leaderboard
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded border flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Teams Form */}
        <form onSubmit={handleSaveTeams} className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-lg shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                Manage Tournament Roster
              </h2>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
                Dynamic Roster • Pre-Populated Default 8 Teams
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-yellow-400 text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <ListRestart className="w-3.5 h-3.5" />
              <span>Reset Default 8 Teams</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-400 mb-2" />
              LOADING TEAMS...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((name, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        Team {idx < 9 ? `0${idx + 1}` : idx + 1}
                      </label>
                      {teams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeam(idx)}
                          className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 font-mono uppercase cursor-pointer"
                          title="Remove team"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={e => handleTeamChange(idx, e.target.value)}
                      required
                      placeholder={`Team Name ${idx + 1}`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-2.5 text-white font-extrabold uppercase focus:outline-none focus:border-yellow-400 text-sm"
                    />
                    <input
                      type="text"
                      value={teams[idx].lead}
                      onChange={e => handleLeadChange(idx, e.target.value)}
                      placeholder="Team Lead Name (optional)"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="w-full py-2.5 border border-dashed border-zinc-800 hover:border-yellow-400/50 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 hover:text-yellow-400 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Team Field</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-base rounded shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Team Roster</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Danger Zone: Reset Tournament */}
        <div className="bg-zinc-950 border border-red-900/60 p-6 rounded-lg shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-red-500 font-black italic uppercase text-lg tracking-wider">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span>Danger Zone: Clear Tournament Data</span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            Clears all submitted match scores and leaderboard standings from the database, resetting all teams back to 0 points. Team names will be preserved.
          </p>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-5 py-2.5 bg-red-500/10 border border-red-500/40 hover:bg-red-500 text-red-400 hover:text-white font-black uppercase tracking-wider text-xs rounded transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Scores to Zero</span>
            </button>
          ) : (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded space-y-3 font-mono">
              <p className="text-xs font-bold text-red-200 uppercase tracking-wider">
                Confirm action: Reset all scores to 0?
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetTournament}
                  disabled={isResetting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs rounded transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Yes, Wipe Scores'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-xs rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
