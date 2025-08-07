
"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock3, Trophy } from 'lucide-react';

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
    onRestartGame: () => void;
    score: number;
    moves: number;
    time: number;
    bestScore?: number;
    bestTime?: number;
}

export default function VictoryDialog({ isOpen, onNewGame, onRestartGame, score, moves, time, bestScore, bestTime }: VictoryDialogProps) {
    if (!isOpen) return null;

    const formatTime = (seconds?: number) => {
        if (seconds === undefined || seconds === Infinity || isNaN(seconds)) return "N/A";
        const date = new Date(seconds * 1000);
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const secs = date.getUTCSeconds().toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    return (
        <Dialog open={isOpen} >
            <DialogContent data-testid="victory-dialog">
                <Confetti />
                <DialogHeader>
                    <DialogTitle className="text-xs">
                        Game Over
                    </DialogTitle>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell className="text-right">{formatTime(time)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Number of Moves</TableCell>
                                <TableCell className="text-right">{moves}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Score</TableCell>
                                <TableCell className="text-right">{score === -Infinity ? "N/A" : score}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <svg viewBox="0 0 1100 100" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,50 C300,0 900,170 1100,60" stroke="currentColor" fill="none" strokeWidth="6"/>
                    </svg>
                    <Table>
                        <TableBody>
                             <TableRow>
                                <TableCell className="flex items-center gap-1">
                                    <Trophy/>
                                    High Score
                                </TableCell>
                                <TableCell className="text-right">{bestScore === undefined || bestScore === -Infinity ? "N/A" : bestScore}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="flex items-center gap-1">
                                    <Clock3/>
                                    Best Time
                                </TableCell>
                                <TableCell className="text-right">{formatTime(bestTime)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </DialogHeader>
                <DialogFooter className="flex justify-between w-full">
                    <Button onClick={onRestartGame} variant="outline">Play Again</Button>
                    <Button onClick={onNewGame}>New Game</Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>
    );
}
