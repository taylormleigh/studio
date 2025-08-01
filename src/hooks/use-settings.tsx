
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type GameType = 'Solitaire' | 'Freecell' | 'Spider';
export type SolitaireDrawType = 1 | 3;
export type SpiderSuitCount = 1 | 2 | 4;
export type CardStyle = 'modern' | 'domino';
export type ColorMode = 'color' | 'greyscale';

export interface GameSettings {
  gameType: GameType;
  solitaireDrawCount: SolitaireDrawType;
  spiderSuits: SpiderSuitCount;
  leftHandMode: boolean;
  autoMove: boolean;
  cardStyle: CardStyle;
  colorMode: ColorMode;
}

const defaultSettings: GameSettings = {
  gameType: 'Solitaire',
  solitaireDrawCount: 1,
  spiderSuits: 2,
  leftHandMode: true,
  autoMove: true,
  cardStyle: 'modern',
  colorMode: 'color',
};

interface SettingsContextType {
  settings: GameSettings;
  setSettings: (settings: Partial<GameSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<GameSettings>(defaultSettings);

  // Effect to load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('deck-of-cards-settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettingsState(prev => ({...defaultSettings, ...parsedSettings}));
      }
    } catch (error) {
      console.error("Could not load settings from localStorage", error);
    }
  }, []);
  
  // Effect to apply/remove classes and save to localStorage
  useEffect(() => {
    // Apply dark mode class
    if (settings.cardStyle === 'domino') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Apply greyscale class
    if (settings.colorMode === 'greyscale') {
      document.documentElement.classList.add('grayscale');
    } else {
      document.documentElement.classList.remove('grayscale');
    }
    
    // Save settings to localStorage
    try {
      localStorage.setItem('deck-of-cards-settings', JSON.stringify(settings));
    } catch (error) {
      console.error("Could not save settings to localStorage", error);
    }
  }, [settings]);


  const setSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
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
