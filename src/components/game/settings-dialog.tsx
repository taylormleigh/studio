
"use client";

import * as React from 'react';
import { useSettings, GameType, SolitaireDrawType, SpiderSuitCount, GameSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CardPreview } from './card-preview';


interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewGame: () => void;
}

export function SettingsDialog({ open, onOpenChange, onNewGame }: SettingsDialogProps) {
  const { settings, setSettings } = useSettings();
  const [initialSettings, setInitialSettings] = React.useState(settings);
  const [hasRuleChanged, setHasRuleChanged] = React.useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setInitialSettings(settings); // snapshot settings on open
      setHasRuleChanged(false);
    }
  };
  
  const handleGameRuleChange = (newSettings: Partial<GameSettings>) => {
    setSettings(newSettings);
    // check if the new setting is different from the initial setting for game rules
    if (newSettings.gameType && newSettings.gameType !== initialSettings.gameType) {
        setHasRuleChanged(true);
    } else if (newSettings.solitaireDrawCount && newSettings.solitaireDrawCount !== initialSettings.solitaireDrawCount) {
        setHasRuleChanged(true);
    } else if (newSettings.spiderSuits && newSettings.spiderSuits !== initialSettings.spiderSuits) {
        setHasRuleChanged(true);
    }
  };

  const handleClose = () => {
    if(hasRuleChanged) {
        onNewGame();
    }
    onOpenChange(false);
  }

  const handleNewGameClick = () => {
    onOpenChange(false);
    onNewGame();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xs">
            a deck of cards
          </DialogTitle>
          <h1>Games</h1>
          <DialogDescription className="text-xs">
            Selecting a different game or different game rules will require you to start a new game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-type" className="text-right">
              Game
            </Label>
            <Select
              value={settings.gameType}
              onValueChange={(value) => {
                handleGameRuleChange({ gameType: value as GameType });
              }}
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

          {settings.gameType === 'Solitaire' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="draw-count" className="text-right">
                Draw
              </Label>
              <RadioGroup
                id="draw-count"
                value={String(settings.solitaireDrawCount)}
                onValueChange={(value) => {
                  handleGameRuleChange({ solitaireDrawCount: Number(value) as SolitaireDrawType });
                }}
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

          {settings.gameType === 'Spider' && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="spider-suits" className="text-right">Suits</Label>
                <RadioGroup
                  id="spider-suits"
                  value={String(settings.spiderSuits)}
                   onValueChange={(value) => {
                    handleGameRuleChange({ spiderSuits: Number(value) as SpiderSuitCount });
                  }}
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

          <Button onClick={handleNewGameClick}>New Game</Button>
          
          <Separator />
          
          <DialogHeader>
            <h1>Settings</h1>
            <DialogDescription className="text-xs">
              Settings related to gameplay/view will be updated immediately.
            </DialogDescription>
         </DialogHeader>
         
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
              <Label htmlFor="auto-move">{settings.autoMove ? 'Click to move' : 'Drag to move'}</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Theme</Label>
              <div className="col-span-3 flex items-center gap-2">
                <CardPreview
                  styleType="modern"
                  isSelected={settings.cardStyle === 'modern'}
                  onClick={() => setSettings({ cardStyle: 'modern' })}
                />
                <CardPreview
                  styleType="domino"
                  isSelected={settings.cardStyle === 'domino'}
                  onClick={() => setSettings({ cardStyle: 'domino' })}
                />
              </div>
          </div>

        </div>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        
      </DialogContent>
    </Dialog>
  );
}
