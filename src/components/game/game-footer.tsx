
"use client";

import { memo } from 'react';
import { Pointer, Hourglass, Smile } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';

const iconStrokeWidth = 1.85;
const iconSize = 18;

interface GameFooterProps {
  moves: number;
  time: number;
  score?: number;
}

function GameFooter({ moves, time, score }: GameFooterProps) {
  const { settings } = useSettings();
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
