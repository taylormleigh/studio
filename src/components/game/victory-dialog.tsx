
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Confetti = () => {
  const confettiCount = 50;
  const colors = ['#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e'];
  return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="confetti">
          {Array.from({ length: confettiCount }).map((_, i) => (
              <div
                  key={i}
                  className="confetti"
                  style={{
                      left: `${Math.random() * 100}vw`,
                      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                      animationDelay: `${Math.random() * 5}s`,
                  }}
              />
          ))}
      </div>
  );
};

interface VictoryDialogProps {
    isOpen: boolean;
    onNewGame: () => void;
    score: number;
    moves: number;
    time: number;
    bestScore?: number;
}

export default function VictoryDialog({ isOpen, onNewGame, score, moves, time, bestScore }: VictoryDialogProps) {
    if (!isOpen) return null;

    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent data-testid="victory-dialog">
                <Confetti />
                <AlertDialogHeader>
                    <AlertDialogTitle>Congratulations! You Won!</AlertDialogTitle>
                    <AlertDialogDescription className='space-y-2'>
                        <div>Your final score is {score} in {moves} moves. Time: {formatTime(time)}.</div>
                        {(bestScore ?? 0) > 0 && <div>Your best score is {bestScore}.</div>}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onNewGame}>Play Again</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    );
}
