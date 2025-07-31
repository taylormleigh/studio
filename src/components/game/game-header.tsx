"use client";

import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { Sparkles, MousePointer, Snail } from 'lucide-react';

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
  const buttonClasses = "flex-col h-auto p-3 md:px-2 md:py-1 md:w-20";

  const MainButtons = () => (
    <>
      <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className={buttonClasses}>
        <Sparkles className="w-7 h-7" />
        <span className="hidden md:block text-xs font-medium">settings</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game" className={buttonClasses}>
        <Snail className="w-7 h-7" />
        <span className="hidden md:block text-xs font-medium">new</span>
      </Button>
    </>
  );

  const UndoButton = () => (
    <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={buttonClasses}>
      <MousePointer className="w-7 h-7" />
      <span className="hidden md:block text-xs font-medium">undo</span>
    </Button>
  );

  const LeftGroup = () => settings.leftHandMode ? <UndoButton /> : <MainButtons />;
  const RightGroup = () => settings.leftHandMode ? <MainButtons /> : <UndoButton />;

  return (
    <header className={cn("grid grid-cols-3 items-center bg-[hsl(var(--header-background))] border-b p-1 md:py-2")}>
      <div className={cn(buttonContainerClasses, "justify-start")}>
        {settings.leftHandMode ? <UndoButton /> : <MainButtons />}
      </div>

      <div className="text-center">
        <h1 onClick={onStats} className="game-title font-headline text-primary cursor-pointer">
          {settings.gameType}
        </h1>
      </div>

      <div className="flex items-center gap-1 justify-end">
        <RightGroup />
      </div>
    </header>
  );
}
