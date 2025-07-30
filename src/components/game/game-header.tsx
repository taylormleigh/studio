
"use client";

import { Button } from '@/components/ui/button';
import { RotateCcw, PlusSquare, Settings, BarChartBig } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

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
    <header className={cn(
      "flex justify-between items-center bg-card border-b p-1",
      !settings.leftHandMode && "flex-row-reverse"
    )}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <RotateCcw className="w-9 h-9" />
        </Button>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
        {settings.gameType}
      </h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics">
          <BarChartBig className="w-9 h-9" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings">
          <Settings className="w-9 h-9" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game">
          <PlusSquare className="w-9 h-9" />
        </Button>
      </div>
    </header>
  );
}
