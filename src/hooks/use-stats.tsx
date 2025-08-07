
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { GameType } from './use-settings';

export interface GameStats {
  wins: number;
  bestScore: number;
  bestTime: number; // in seconds
}

export type StatsState = {
  [key in GameType]?: GameStats;
};

const defaultStats: StatsState = {
  Solitaire: { wins: 0, bestScore: -Infinity, bestTime: Infinity },
  Freecell: { wins: 0, bestScore: -Infinity, bestTime: Infinity },
  Spider: { wins: 0, bestScore: -Infinity, bestTime: Infinity },
};

interface StatsContextType {
  stats: StatsState;
  updateStats: (args: { gameType: GameType; stats: Partial<GameStats> }) => void;
  resetStats: (gameType: GameType) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStatsState] = useState<StatsState>(defaultStats);

  useEffect(() => {
    try {
      const storedStats = localStorage.getItem('deck-of-cards-stats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats);
        // Merge with default stats to ensure all game types are present
        setStatsState(prev => ({
          ...defaultStats,
          ...prev,
          ...parsedStats
        }));
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Could not load stats from localStorage`, error);
    }
  }, []);

  const updateStats = useCallback(({ gameType, stats: newStats }: { gameType: GameType; stats: Partial<GameStats> }) => {
    setStatsState(prev => {
      const currentGameStats = prev[gameType] || { wins: 0, bestScore: -Infinity, bestTime: Infinity };
      const updatedGameStats: GameStats = {
        ...currentGameStats,
        wins: currentGameStats.wins + (newStats.wins || 0),
        bestScore: Math.max(currentGameStats.bestScore, newStats.bestScore ?? -Infinity),
        bestTime: Math.min(currentGameStats.bestTime, newStats.bestTime ?? Infinity),
      };

      const updatedStats = { ...prev, [gameType]: updatedGameStats };
      
      try {
        localStorage.setItem('deck-of-cards-stats', JSON.stringify(updatedStats));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Could not save stats to localStorage`, error);
      }
      return updatedStats;
    });
  }, []);

  const resetStats = useCallback((gameType: GameType) => {
    setStatsState(prev => {
        const updatedStats = { ...prev, [gameType]: defaultStats[gameType] };
        try {
            localStorage.setItem('deck-of-cards-stats', JSON.stringify(updatedStats));
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Could not save stats to localStorage`, error);
        }
        return updatedStats;
    });
  }, []);


  return (
    <StatsContext.Provider value={{ stats, updateStats, resetStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}
