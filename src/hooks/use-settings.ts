
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type GameType = 'Klondike' | 'Freecell' | 'Spider' | 'Pyramid';
export type KlondikeDrawType = 1 | 3;
export type SpiderSuitCount = 1 | 2 | 4;

export interface GameSettings {
  gameType: GameType;
  klondikeDrawCount: KlondikeDrawType;
  spiderSuits: SpiderSuitCount;
  leftHandMode: boolean;
  autoMove: boolean;
}

const defaultSettings: GameSettings = {
  gameType: 'Klondike',
  klondikeDrawCount: 1,
  spiderSuits: 2,
  leftHandMode: false,
  autoMove: true,
};

interface SettingsContextType {
  settings: GameSettings;
  setSettings: (settings: Partial<GameSettings>) => void;
  resetToDefault: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<GameSettings>(defaultSettings);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('deck-of-cards-settings');
      if (storedSettings) {
        setSettingsState(prev => ({...prev, ...JSON.parse(storedSettings)}));
      }
    } catch (error) {
      console.error("Could not load settings from localStorage", error);
    }
  }, []);

  const setSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettingsState(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      try {
        localStorage.setItem('deck-of-cards-settings', JSON.stringify(updatedSettings));
      } catch (error) {
        console.error("Could not save settings to localStorage", error);
      }
      return updatedSettings;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setSettingsState(defaultSettings);
    try {
        localStorage.setItem('deck-of-cards-settings', JSON.stringify(defaultSettings));
      } catch (error) {
        console.error("Could not save settings to localStorage", error);
      }
  }, []);


  return (
    <SettingsContext.Provider value={{ settings, setSettings, resetToDefault }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
