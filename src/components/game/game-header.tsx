
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

  const buttonContainerClasses = "flex items-center gap-1 md:gap-2";
  const buttonClasses = "flex-col h-auto p-1 md:px-2 md:py-1 md:w-20";

  return (
    <header className={cn(
      "flex justify-between items-center bg-card border-b p-1 md:py-2"
    )}>
      <div className={cn(
          buttonContainerClasses, 
          "justify-start",
          settings.leftHandMode ? "order-3" : "order-1"
        )}>
        <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game" className={buttonClasses}>
          <PlusSquare className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">new</span>
        </Button>
         <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={buttonClasses}>
          <RotateCcw className="w-7 h-7" />
          <span className="hidden md:block text-xs font-medium">undo</span>
        </Button>
      </div>

      <div className="flex-1 text-center order-2">
        <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
          {settings.gameType}
        </h1>
      </div>

      <div className={cn(
          buttonContainerClasses,
          "justify-end",
          settings.leftHandMode ? "order-1" : "order-3"
        )}>
        <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics" className={buttonClasses}>
          <BarChartBig className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">stats</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className={buttonClasses}>
          <Settings className="w-7 h-7" />
           <span className="hidden md:block text-xs font-medium">settings</span>
        </Button>
      </div>
    </header>
  );
}
