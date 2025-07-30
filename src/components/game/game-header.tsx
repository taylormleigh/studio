"use client";

import { Button } from '@/components/ui/button';
import { RotateCcw, Lightbulb, PlusSquare, Settings, LoaderCircle } from 'lucide-react';

type GameHeaderProps = {
  score: number;
  moves: number;
  time: number;
  onNewGame: () => void;
  onUndo: () => void;
  onHint: () => void;
  onSettings: () => void;
  canUndo: boolean;
  isHintPending: boolean;
};

export default function GameHeader({ score, moves, time, onNewGame, onUndo, onHint, onSettings, canUndo, isHintPending }: GameHeaderProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="mb-2 space-y-2">
      <div className="flex justify-between items-start">
        <h1 className="text-xl sm:text-3xl font-bold font-headline text-primary">Deck of Cards</h1>
        <div className="flex items-center gap-2 sm:gap-4 text-right">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">SCORE</div>
            <div className="text-base sm:text-lg font-bold">{score}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">TIME</div>
            <div className="text-base sm:text-lg font-bold">{formatTime(time)}</div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center bg-card border rounded-md p-1">
        <div className="flex items-center gap-0 sm:gap-1">
          <Button variant="ghost" size="sm" onClick={onNewGame}>
            <PlusSquare className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Game</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
            <RotateCcw className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onHint} disabled={isHintPending}>
            {isHintPending ? <LoaderCircle className="animate-spin mr-1 sm:mr-2" /> : <Lightbulb className="mr-1 sm:mr-2" />}
            <span className="hidden sm:inline">Hint</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-center px-2">
            <div className="text-xs font-semibold text-muted-foreground">MOVES</div>
            <div className="text-base sm:text-lg font-bold">{moves}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onSettings}>
            <Settings />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
