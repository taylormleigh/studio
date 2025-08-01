
"use client";

import { useState, useEffect } from 'react';
import { useStats, GameStats } from '@/hooks/use-stats';
import { useSettings, GameType, SolitaireDrawType, SpiderSuitCount } from '@/hooks/use-settings';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewGame: () => void;
}

const emptyStats: GameStats = {
  wins: 0,
  bestScore: -Infinity,
  bestTime: Infinity,
}

export function GameDialog({ open, onOpenChange, onNewGame }: GameDialogProps) {
  const { stats } = useStats();
  const { settings, setSettings } = useSettings();
  const [tempSettings, setTempSettings] = useState(settings);

  // When the dialog opens, sync temp state with global state.
  // Also, when the global settings change (e.g. from the settings dialog),
  // reflect that change here.
  useEffect(() => {
    setTempSettings(settings);
  }, [settings, open]);


  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setTempSettings(settings); // Reset temp settings when dialog opens
    }
  };

  const handleNewGameClick = () => {
    setSettings(tempSettings); // Apply settings
    onNewGame(); // Start new game
    onOpenChange(false); // Close dialog
  }

  const gameStats = stats[tempSettings.gameType] || emptyStats;

  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds)) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const StatsTab = () => (
    <>
      <DialogHeader>
          <DialogTitle>{tempSettings.gameType} Statistics</DialogTitle>
          <DialogDescription>
            Your performance for the selected game type.
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
    </>
  );

  const OptionsTab = () => (
     <div className="grid gap-6 py-4">
        <DialogHeader>
            <DialogTitle>Game Options</DialogTitle>
            <DialogDescription>
                Selecting a different game or changing the rules will start a new game.
            </DialogDescription>
        </DialogHeader>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-type" className="text-right">
              Game
            </Label>
            <Select
              value={tempSettings.gameType}
              onValueChange={(value) => setTempSettings(s => ({...s, gameType: value as GameType}))}
            >
              <SelectTrigger id="game-type" className="col-span-3">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solitaire">Solitaire</SelectItem>
                <SelectItem value="Freecell">Freecell</SelectItem>
                <SelectItem value="Spider">Spider</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tempSettings.gameType === 'Solitaire' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="draw-count" className="text-right">
                Draw
              </Label>
              <RadioGroup
                id="draw-count"
                value={String(tempSettings.solitaireDrawCount)}
                onValueChange={(value) => setTempSettings(s => ({...s, solitaireDrawCount: Number(value) as SolitaireDrawType}))}
                className="col-span-3 flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="draw-1" />
                  <Label htmlFor="draw-1">one</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="draw-3" disabled />
                  <Label htmlFor="draw-3" className="text-muted-foreground">three</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {tempSettings.gameType === 'Spider' && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="spider-suits" className="text-right">Suits</Label>
                <RadioGroup
                  id="spider-suits"
                  value={String(tempSettings.spiderSuits)}
                  onValueChange={(value) => setTempSettings(s => ({...s, spiderSuits: Number(value) as SpiderSuitCount}))}
                  className="col-span-3 flex items-center gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="suits-1" />
                        <Label htmlFor="suits-1">one</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="suits-2" />
                        <Label htmlFor="suits-2">two</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="4" id="suits-4" />
                        <Label htmlFor="suits-4">four</Label>
                    </div>
                </RadioGroup>
             </div>
          )}
        </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            <TabsContent value="stats">
                <StatsTab />
            </TabsContent>
            <TabsContent value="options">
                <OptionsTab />
            </TabsContent>
        </Tabs>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleNewGameClick}>New Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
