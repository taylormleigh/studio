
"use client";

import { GameStats } from '@/hooks/use-stats';
import { GameType } from '@/hooks/use-settings';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface StatisticsTableProps {
  stats: GameStats;
  gameType: GameType;
}

export function StatisticsTable({ stats, gameType }: StatisticsTableProps) {
  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds)) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-0">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Wins</TableCell>
            <TableCell className="text-right">{stats.wins}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>High Score</TableCell>
            <TableCell className="text-right">{stats.bestScore === -Infinity ? "N/A" : stats.bestScore}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Best Time</TableCell>
            <TableCell className="text-right">{formatTime(stats.bestTime)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
