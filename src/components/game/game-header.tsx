
"use client";

import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { Snail, Sparkles, MousePointer } from 'lucide-react';

type GameHeaderProps = {
  onNewGame: () => void;
  onUndo: () => void;
  onSettings: () => void;
  onGameMenuOpen: () => void;
  canUndo: boolean;
};

const iconSize = 26;
const iconStrokeWidth = 1.85;

export default function GameHeader({ onNewGame, onUndo, onSettings, onGameMenuOpen, canUndo }: GameHeaderProps) {
  const { settings } = useSettings();

  const buttonContainerClasses = "flex items-center gap-1 md:gap-2";
  const buttonClasses = "flex-col h-auto p-2 lg:w-20";

  const MainButtons = () => (
    <>
      <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className={buttonClasses}>
        <Sparkles size={iconSize} strokeWidth={iconStrokeWidth} />
        <span className="hidden lg:block text-xs font-medium">settings</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New Game" className={buttonClasses}>
        <Snail size={iconSize} strokeWidth={iconStrokeWidth} />
        <span className="hidden lg:block text-xs font-medium">new</span>
      </Button>
    </>
  );

  const UndoButton = () => (
    <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={buttonClasses}>
      <MousePointer size={iconSize} strokeWidth={iconStrokeWidth} />
      <span className="hidden lg:block text-xs font-medium">undo</span>
    </Button>
  );

  const LeftGroup = () => settings.leftHandMode ? <UndoButton /> : <MainButtons />;
  const RightGroup = () => settings.leftHandMode ? <MainButtons /> : <UndoButton />;

  return (
    <header className={cn("grid grid-cols-3 items-center bg-[hsl(var(--header-background))] border-b p-1")}>
      <div className={cn(buttonContainerClasses, "justify-start")}>
        <LeftGroup />
      </div>

      <div className="text-center">
        <h1 onClick={onGameMenuOpen} className="game-title font-headline text-primary cursor-pointer" data-testid="game-title">
          {settings.gameType}
        </h1>
      </div>

      <div className={cn(buttonContainerClasses, "justify-end")}>
        <RightGroup />
      </div>
    </header>
  );
}
