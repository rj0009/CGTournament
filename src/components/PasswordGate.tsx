import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface PasswordGateProps {
  onUnlock: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlock }) => {
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState(false);

  // Read password from env var, defaulting to '4321' if env is missing
  const targetPassword = ((import.meta as any).env?.VITE_APP_PASSWORD) || '4321';

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword.trim() === targetPassword) {
      localStorage.setItem('ncss_app_unlocked', 'true');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setInputPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex items-center justify-center p-4 font-sans selection:bg-yellow-400 selection:text-black">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-xl shadow-2xl space-y-6">
        
        {/* Header Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-yellow-400 text-black font-black rounded-lg mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-[0.2em] bg-zinc-900 text-yellow-400 border border-zinc-800 rounded">
              Protected Event Access
            </span>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              NCSS CG Tournament
            </h1>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Enter Passcode to Access Dashboard
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              Event Passcode
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setError(false);
                }}
                placeholder="••••"
                autoFocus
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3.5 pl-11 text-white font-mono font-bold text-xl tracking-widest focus:outline-none focus:border-yellow-400 placeholder:text-zinc-700"
              />
              <KeyRound className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Invalid passcode. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-sm rounded shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Unlock Dashboard</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-900 text-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            NCSS Corporate Group Fun Team Activities
          </p>
        </div>

      </div>
    </div>
  );
};
