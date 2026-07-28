import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Leaderboard } from './components/Leaderboard';
import { StationMaster } from './components/StationMaster';
import { TournamentSetup } from './components/TournamentSetup';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderContent = () => {
    if (currentPath.startsWith('/station')) {
      const parts = currentPath.split('/');
      const stationId = parts[2] || 'foosball';
      return <StationMaster stationId={stationId} onNavigate={navigate} />;
    }

    if (currentPath === '/setup') {
      return <TournamentSetup onNavigate={navigate} />;
    }

    // Default to Leaderboard for / or /leaderboard
    return <Leaderboard />;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      <Navigation currentPath={currentPath} onNavigate={navigate} />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}
