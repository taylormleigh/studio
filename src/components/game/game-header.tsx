
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
      "flex justify-between items-center bg-card border-b p-1 md:py-2",
      !settings.leftHandMode && "flex-row-reverse"
    )}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="flex-col h-auto w-auto p-1 md:px-2 md:py-1">
          <RotateCcw className="w-7 h-7" />
          <span className="hidden md:block text-xs font-medium">Undo</span>
        </Button>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
        {settings.gameType}
      </h1>
      <div className="flex items-center gap-1 md:gap-2">
         <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics" className="flex-col h-auto w-auto p-1 md:px-2 md:py-1">
          <BarChartBig className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">Stats</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className="flex-col h-auto w-auto p-1 md:px-2 md:py-1">
          <Settings className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">Settings</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game" className="flex-col h-auto w-auto p-1 md:px-2 md:py-1">
          <PlusSquare className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">New Game</span>
        </Button>
      </div>
    </header>
  );
}
