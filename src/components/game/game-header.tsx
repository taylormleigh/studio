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

  const buttonClasses = "flex-col h-auto p-1 md:px-2 md:py-1 md:w-20";

  const MainButtons = () => (
    <>
      <Button variant="ghost" size="icon" onClick={onStats} aria-label="Statistics" className={buttonClasses}>
        <BarChartBig className="w-7 h-7" />
        <span className="hidden md:block text-xs font-medium">stats</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className={buttonClasses}>
        <Settings className="w-7 h-7" />
        <span className="hidden md:block text-xs font-medium">settings</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game" className={buttonClasses}>
        <PlusSquare className="w-7 h-7" />
        <span className="hidden md:block text-xs font-medium">new</span>
      </Button>
    </>
  );

  const UndoButton = () => (
    <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={buttonClasses}>
      <RotateCcw className="w-7 h-7" />
      <span className="hidden md:block text-xs font-medium">undo</span>
    </Button>
  );

  const LeftGroup = () => settings.leftHandMode ? <UndoButton /> : <MainButtons />;
  const RightGroup = () => settings.leftHandMode ? <MainButtons /> : <UndoButton />;

  return (
    <header className={cn("grid grid-cols-3 items-center bg-card border-b p-1 md:py-2")}>
      <div className="flex items-center gap-1 md:gap-2 justify-start">
        <LeftGroup />
      </div>

      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
          {settings.gameType}
        </h1>
      </div>

      <div className="flex items-center gap-1 md:gap-2 justify-end">
        <RightGroup />
      </div>
    </header>
  );
}
