
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '../ui/separator';
import { StatisticsTable } from './statistics-table';

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
  useEffect(() => {
    if (open) {
      setTempSettings(settings);
    }
  }, [open, settings]);

  const handleNewGameClick = () => {
    setSettings(tempSettings); // Apply settings
    onNewGame(); // Start new game
    onOpenChange(false); // Close dialog
  }

  const selectedGameStats = stats[tempSettings.gameType] || emptyStats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
            <DialogTitle className="text-xs">
              a deck of cards
            </DialogTitle>
            <h1>Games</h1>
            <DialogDescription className="text-xs">
              Select a game to see statistics or change the rules for a new game.
            </DialogDescription>
         </DialogHeader>

        <div className="grid gap-4 py-4">
            {/* Game Selection */}
            <RadioGroup
                value={tempSettings.gameType}
                onValueChange={(value) => setTempSettings(s => ({...s, gameType: value as GameType}))}
                className="grid grid-cols-3 gap-2"
            >
                <Label htmlFor="solitaire" className={`flex flex-col items-center justify-center rounded-md border-2 p-3 cursor-pointer ${tempSettings.gameType === 'Solitaire' ? 'border-primary' : ''}`}>
                    <RadioGroupItem value="Solitaire" id="solitaire" className="sr-only" />
                    Solitaire
                </Label>
                 <Label htmlFor="freecell" className={`flex flex-col items-center justify-center rounded-md border-2 p-3 cursor-pointer ${tempSettings.gameType === 'Freecell' ? 'border-primary' : ''}`}>
                    <RadioGroupItem value="Freecell" id="freecell" className="sr-only" />
                    Freecell
                </Label>
                 <Label htmlFor="spider" className={`flex flex-col items-center justify-center rounded-md border-2 p-3 cursor-pointer ${tempSettings.gameType === 'Spider' ? 'border-primary' : ''}`}>
                    <RadioGroupItem value="Spider" id="spider" className="sr-only" />
                    Spider
                </Label>
            </RadioGroup>
            <Button onClick={handleNewGameClick}>New Game</Button>

            {/* Conditional Game Options */}
            {tempSettings.gameType === 'Solitaire' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Draw</Label>
                    <RadioGroup
                        value={String(tempSettings.solitaireDrawCount)}
                        onValueChange={(value) => setTempSettings(s => ({...s, solitaireDrawCount: Number(value) as SolitaireDrawType}))}
                        className="col-span-3 flex items-center gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="draw-1" />
                            <Label htmlFor="draw-1">One</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="3" id="draw-3" disabled />
                            <Label htmlFor="draw-3" className="text-muted-foreground">Three</Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
            {tempSettings.gameType === 'Spider' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Suits</Label>
                    <RadioGroup
                        value={String(tempSettings.spiderSuits)}
                        onValueChange={(value) => setTempSettings(s => ({...s, spiderSuits: Number(value) as SpiderSuitCount}))}
                        className="col-span-3 flex items-center gap-4"
                    >
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="suits-1" />
                            <Label htmlFor="suits-1">One</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="2" id="suits-2" />
                            <Label htmlFor="suits-2">Two</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="4" id="suits-4" />
                            <Label htmlFor="suits-4">Four</Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
        </div>

        <Separator />
        
        <StatisticsTable gameType={tempSettings.gameType} stats={selectedGameStats} />

      </DialogContent>
    </Dialog>
  );
}
