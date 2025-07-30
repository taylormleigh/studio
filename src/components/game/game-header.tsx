"use client";

import { Button } from '@/components/ui/button';
import { RotateCcw, PlusSquare, Settings, BarChartBig } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';

type GameHeaderProps = {
  onNewGame: () => void;
  onUndo: () => void;
  onSettings: () => void;
  onStats: () => void;
  canUndo: boolean;
};

export default function GameHeader({ onNewGame, onUndo, onSettings, onStats, canUndo }: GameHeaderProps) {
  const { settings } = useSettings();

  return (
    <header className="flex justify-between items-center bg-card border rounded-md p-1 mb-2">
      <div className="flex items-center gap-0 sm:gap-1">
        <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game">
          <PlusSquare />
        </Button>
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <RotateCcw />
        </Button>
      </div>
      <h1 className="text-lg sm:text-xl font-bold font-headline text-primary">
        {settings.gameType}
      </h1>
      <div className="flex items-center gap-0 sm:gap-1">
        <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics">
          <BarChartBig />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings">
          <Settings />
        </Button>
      </div>
    </header>
  );
}
