import React from 'react';
import { Trophy, Gamepad2, Settings, Tv, Dices, Target, Flame, Activity, Lock } from 'lucide-react';

interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLock?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPath, onNavigate, onLock }) => {
  const stations = [
    { id: 'foosball', label: 'Foosball', icon: Dices },
    { id: 'pool', label: 'Pool Table', icon: Target },
    { id: 'darts', label: 'Darts', icon: Flame },
    { id: 'basketball', label: 'Basketball', icon: Activity },
  ];

  const isStationActive = currentPath.startsWith('/station');
  const activeStationId = currentPath.split('/')[2] || 'foosball';

  return (
    <header className="bg-[#0A0A0A] border-b border-zinc-800 text-white sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo with Bold Typography */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/leaderboard')}
              className="flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="p-2.5 bg-yellow-400 text-black font-black rounded group-hover:bg-yellow-300 transition-colors shrink-0">
                <Trophy className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none flex items-center gap-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-zinc-400">
                    NCSS CG Tournament
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black tracking-widest bg-red-500/10 text-red-500 border border-red-500/30 rounded uppercase not-italic">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Live Feed
                  </span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5 hidden sm:block">
                  NCSS Corporate Group • Fun Team Activities
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Links with Bold Styling */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/leaderboard')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                currentPath === '/' || currentPath === '/leaderboard'
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>TV Leaderboard</span>
            </button>

            <button
              onClick={() => onNavigate(`/station/${activeStationId}`)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                isStationActive
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Station Entry</span>
            </button>

            <button
              onClick={() => onNavigate('/setup')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer rounded ${
                currentPath === '/setup'
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Setup</span>
            </button>

            {onLock && (
              <button
                onClick={onLock}
                title="Lock Application"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
          </nav>

        </div>

        {/* Station Sub-Navigation Bar */}
        <div className="flex items-center gap-2 py-2 overflow-x-auto border-t border-zinc-800/80 no-scrollbar text-xs font-mono">
          <span className="text-zinc-600 font-bold px-2 uppercase tracking-[0.2em] shrink-0 text-[10px]">
            Direct Station Links:
          </span>
          {stations.map(st => {
            const Icon = st.icon;
            const path = `/station/${st.id}`;
            const isActive = currentPath === path;
            return (
              <button
                key={st.id}
                onClick={() => onNavigate(path)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded shrink-0 transition-all text-[11px] font-bold uppercase cursor-pointer ${
                  isActive
                    ? 'bg-zinc-100 text-black font-black'
                    : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-yellow-400" />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
