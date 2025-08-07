
"use client";

import { GameStats } from '@/hooks/use-stats';
import { GameType } from '@/hooks/use-settings';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Crown, Clock3, Trophy } from 'lucide-react';

interface StatisticsTableProps {
  wins?: number;
  highScore?: number;
  bestTime?: number;
}

const iconStrokeWidth = 2;
const iconSize = 18;

export function StatisticsTable({ wins, highScore, bestTime }: StatisticsTableProps) {
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
            <TableCell className="flex items-center gap-1">
                <Crown strokeWidth={iconStrokeWidth} size={iconSize} />
                Wins
            </TableCell>
            <TableCell className="text-right">
              {wins ? wins : "-----"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="flex items-center gap-1">
              <Trophy strokeWidth={iconStrokeWidth} size={iconSize} />
              High Score
            </TableCell>
            <TableCell className="text-right">
              {(!highScore || highScore === -Infinity) ? "-----" : highScore}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="flex items-center gap-1">
                <Clock3 strokeWidth={iconStrokeWidth} size={iconSize} />
                Best Time
            </TableCell>
            <TableCell className="text-right">
              {bestTime ? formatTime(bestTime): "--:--"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
