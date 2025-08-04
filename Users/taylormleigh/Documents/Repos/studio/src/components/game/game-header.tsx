
"use client";

import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { Snail, Sparkles } from 'lucide-react';

type GameHeaderProps = {
  onNewGame: () => void;
  onSettings: () => void;
  onGameMenuOpen: () => void;
};

const iconSize = 32;
const iconStrokeWidth = 1.85;

export default function GameHeader({ onNewGame, onSettings, onGameMenuOpen }: GameHeaderProps) {
  const { settings } = useSettings();

  const buttonContainerClasses = "flex items-center gap-1 md:gap-2";
  const buttonClasses = "flex-col h-auto p-3 lg:w-20";

  const MainButtons = () => (
    <>
      <Button variant="ghost" onClick={onNewGame} aria-label="New Game" className={buttonClasses}>
        <Snail size={iconSize} strokeWidth={iconStrokeWidth} />
        <span className="hidden lg:block text-xs font-medium">new</span>
      </Button>
      <Button variant="ghost" onClick={onSettings} aria-label="Settings" className={buttonClasses}>
        <Sparkles size={iconSize} strokeWidth={iconStrokeWidth} />
        <span className="hidden lg:block text-xs font-medium">settings</span>
      </Button>
    </>
  );

  return (
    <header className={cn("grid grid-cols-3 items-center bg-[hsl(var(--header-background))] border-b p-1")}>
      <div className={cn(buttonContainerClasses, settings.leftHandMode ? "justify-start" : "justify-start opacity-0 pointer-events-none")}>
        <MainButtons />
      </div>

      <div className="text-center">
        <h1 id="game-title" onClick={onGameMenuOpen} className="font-headline text-primary cursor-pointer" data-testid="game-title">
          {settings.gameType}
        </h1>
      </div>

      <div className={cn(buttonContainerClasses, settings.leftHandMode ? "justify-end opacity-0 pointer-events-none" : "justify-end")}>
        <MainButtons />
      </div>
    </header>
  );
}
