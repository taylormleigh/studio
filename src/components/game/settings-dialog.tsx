"use client";

import * as React from 'react';
import { useSettings, GameType, SolitaireDrawType, SpiderSuitCount, CardStyle, GameSettings } from '@/hooks/use-settings';
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
import { cn } from '@/lib/utils';
import { CheckCircle2, Moon, Sun } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewGame: () => void;
}

const CardPreview = ({
  styleType,
  isSelected,
  onClick,
}: {
  styleType: CardStyle;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const isDomino = styleType === 'domino';

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-lg border-2 p-4 transition-all w-28 h-24 flex flex-col items-center justify-center gap-2',
        isSelected ? 'border-primary' : 'border-border',
        isDomino ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'
      )}
    >
        {isDomino ? <Moon /> : <Sun />}
      <div className="text-center text-sm font-medium capitalize">
        {isDomino ? 'Dark' : 'Light'}
      </div>
      {isSelected && (
        <CheckCircle2 className="absolute top-1 right-1 h-5 w-5 text-primary bg-white rounded-full" />
      )}
    </div>
  );
};


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
    onNewGame();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Changing game type or rules will start a new game. Other settings apply instantly.
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
                  <Label htmlFor="draw-1">one card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="draw-3" disabled />
                  <Label htmlFor="draw-3" className="text-muted-foreground">three cards</Label>
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
          
           <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Theme</Label>
              <div className="col-span-3 flex items-center gap-4">
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
              <Label htmlFor="auto-move">{settings.autoMove ? 'Click to move' : 'Drag to move'}</Label>
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button onClick={handleNewGameClick}>New Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
