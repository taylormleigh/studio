
"use client";

import { useStats, GameStats } from '@/hooks/use-stats';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyStats: GameStats = {
  wins: 0,
  bestScore: -Infinity,
  bestTime: Infinity,
}

export function StatsDialog({ open, onOpenChange }: StatsDialogProps) {
  const { stats } = useStats();
  const { settings } = useSettings();

  const gameStats = stats[settings.gameType] || emptyStats;

  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds)) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{settings.gameType} Statistics</DialogTitle>
          <DialogDescription>
            Your performance for the current game type.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statistic</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Wins</TableCell>
                <TableCell className="text-right">{gameStats.wins}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Best Score</TableCell>
                <TableCell className="text-right">{gameStats.bestScore === -Infinity ? "N/A" : gameStats.bestScore}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Best Time</TableCell>
                <TableCell className="text-right">{formatTime(gameStats.bestTime)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    