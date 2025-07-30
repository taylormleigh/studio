
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
          <PlusSquare className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <RotateCcw className="w-6 h-6" />
        </Button>
      </div>
      <h1 className="text-lg sm:text-xl font-bold font-headline text-primary">
        {settings.gameType}
      </h1>
      <div className="flex items-center gap-0 sm:gap-1">
        <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics">
          <BarChartBig className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings">
          <Settings className="w-6 h-6" />
        </Button>
      </div>
    </header>
  );
}
