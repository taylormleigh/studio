
"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewGame: () => void;
}

export function SettingsDialog({ open, onOpenChange, onNewGame }: SettingsDialogProps) {
  const { settings, setSettings, resetToDefault } = useSettings();

  const handleNewGameClick = () => {
    onNewGame();
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Changes to game rules will start a new game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-type" className="text-right">
              Game
            </Label>
            <Select
              value={settings.gameType}
              onValueChange={(value) => setSettings({ gameType: value as GameType })}
            >
              <SelectTrigger id="game-type" className="col-span-3">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solitaire">Solitaire</SelectItem>
                <SelectItem value="Freecell">Freecell</SelectItem>
                <SelectItem value="Spider" disabled>Spider (coming soon)</SelectItem>
                <SelectItem value="Pyramid" disabled>Pyramid (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.gameType === 'Solitaire' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="draw-count" className="text-right">
                Draw
              </Label>
              <RadioGroup
                id="draw-count"
                value={String(settings.solitaireDrawCount)}
                onValueChange={(value) => setSettings({ solitaireDrawCount: Number(value) as SolitaireDrawType })}
                className="col-span-3 flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="draw-1" />
                  <Label htmlFor="draw-1">One card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="draw-3" />
                  <Label htmlFor="draw-3">Three cards</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {settings.gameType === 'Spider' && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="spider-suits" className="text-right">Suits</Label>
                <RadioGroup
                  id="spider-suits"
                  value={String(settings.spiderSuits)}
                  onValueChange={(value) => setSettings({ spiderSuits: Number(value) as SpiderSuitCount })}
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

          <Separator />

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="left-hand-mode" className="text-right">
              Layout
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="left-hand-mode"
                checked={settings.leftHandMode}
                onCheckedChange={(checked) => setSettings({ leftHandMode: checked })}
              />
              <Label htmlFor="left-hand-mode">{settings.leftHandMode ? 'Left-Handed Mode' : 'Right-Handed Mode'}</Label>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="auto-move" className="text-right">
              Gameplay
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="auto-move"
                checked={settings.autoMove}
                onCheckedChange={(checked) => setSettings({ autoMove: checked })}
              />
              <Label htmlFor="auto-move">Auto-move to Foundation on click</Label>
            </div>
          </div>

        </div>
        <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={handleReset}>Reset to Default</Button>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleNewGameClick}>Start New Game</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
