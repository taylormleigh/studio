
"use client";

import { memo, useState, useEffect } from 'react';
import { Pointer, Hourglass, Smile } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';

const iconStrokeWidth = 1.85;
const iconSize = 18;

interface GameFooterProps {
  moves: number;
  score?: number;
}

function GameFooter({ moves, score }: GameFooterProps) {
  const { settings } = useSettings();
  const [time, setTime] = useState(0);
  const [isWon, setIsWon] = useState(false); // Local state to control timer

  // Effect to listen for win state from parent (e.g., via props or context)
  // For now, we simulate this with a prop. A better solution might be a game state context.
  // This is a placeholder for a more robust win state management.
  // In this implementation, the parent GameBoard will re-mount this component on new game, which resets the timer.
  useEffect(() => {
    // A real implementation might get this from a context or prop
    // For now, we assume if the score is part of a win condition, we'd know here.
    // The key is that this component's timer is independent of the main game board's render cycle.
  }, [score]);


  // Timer logic
  useEffect(() => {
    setTime(0);
    const interval = setInterval(() => {
      if (!isWon) { // `isWon` would be updated by the parent or context
        setTime(prevTime => prevTime + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWon]); // Dependency on isWon ensures timer stops/resets correctly


  const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);
  const displayTime = settings.animationMode === 'limited' ? "00:00" : formatTime(time);

  return (
    <footer data-testid="game-footer" className="game-footer flex justify-center items-center text-xs text-muted-foreground p-0">
      <div className="flex flex-row gap-10 w-100">
        <div className="flex flex-row gap-1 items-center p-2" data-testid="moves-counter">
          <Pointer strokeWidth={iconStrokeWidth} size={iconSize} />
          <span>{moves}</span>
        </div>
        
        <div className="flex flex-row gap-1 items-center p-2" data-testid="time-counter">
          <Hourglass strokeWidth={iconStrokeWidth} size={iconSize} />
          <span>{displayTime}</span>
        </div>

        <div className="flex flex-row gap-1 items-center p-2" data-testid="score-counter">
          <Smile strokeWidth={iconStrokeWidth} size={iconSize} />
          <span>{score !== undefined ? score : 'N/A'}</span>
        </div>
      </div>
    </footer>
  );
}

export default memo(GameFooter);
