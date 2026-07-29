import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Leaderboard } from './components/Leaderboard';
import { StationMaster } from './components/StationMaster';
import { TournamentSetup } from './components/TournamentSetup';
import { PasswordGate } from './components/PasswordGate';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('ncss_app_unlocked') === 'true';
  });

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

  const handleLock = () => {
    localStorage.removeItem('ncss_app_unlocked');
    setIsUnlocked(false);
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

  if (!isUnlocked) {
    return <PasswordGate onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      <Navigation currentPath={currentPath} onNavigate={navigate} onLock={handleLock} />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}

