
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

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
    bestTime?: number;
}

export default function VictoryDialog({ isOpen, onNewGame, score, moves, time, bestScore, bestTime }: VictoryDialogProps) {
    if (!isOpen) return null;

    const formatTime = (seconds: number) => {
        if (seconds === Infinity || isNaN(seconds) || seconds === null) return "N/A";
        const date = new Date(seconds * 1000);
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    const isNewBestScore = bestScore !== undefined && score > bestScore;
    const isNewBestTime = bestTime !== undefined && time < bestTime;

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent data-testid="victory-dialog">
                <Confetti />
                <AlertDialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Game Over</TableHead>
                                <TableHead className="text-right">Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell className="text-right">{formatTime(time)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Moves</TableCell>
                                <TableCell className="text-right">{moves}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Score</TableCell>
                                <TableCell className="text-right">{score}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <Separator className="my-2" />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Personal Best</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow>
                                <TableCell>High Score</TableCell>
                                <TableCell className="text-right">{bestScore === undefined || bestScore === -Infinity ? "N/A" : bestScore}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Lowest Time</TableCell>
                                <TableCell className="text-right">{formatTime(bestTime ?? Infinity)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onNewGame}>Play Again</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    );
}
