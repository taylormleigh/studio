

"use client";

import { useSettings, GameType, SolitaireDrawType, SpiderSuitCount, CardStyle } from '@/hooks/use-settings';
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
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

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
  const isClassic = styleType === 'classic';

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-md border-2 p-2 transition-all',
        isSelected ? 'border-primary' : 'border-transparent'
      )}
    >
      <div
        className={cn(
          'aspect-[7/10] w-20 rounded-md border-2 border-black bg-card',
          isClassic ? 'font-serif' : 'font-sans'
        )}
      >
        {isClassic ? (
          <div className="relative h-full p-1" style={{ fontFamily: "'Tinos', serif" }}>
            <div className="flex flex-col items-center absolute top-1 left-1">
              <div className="font-bold text-lg leading-none text-black">K</div>
              <span className="text-lg leading-none text-[#AE1447]">♥</span>
            </div>
          </div>
        ) : (
          <div className="relative p-1 flex flex-col justify-between h-full text-[#AE1447]">
            <div className="flex items-center">
              <div className="text-lg font-bold leading-none">K</div>
            </div>
            <div className="self-center">
              <span className="text-xl">♥</span>
            </div>
            <div className="flex items-center self-end rotate-180">
              <div className="text-lg font-bold leading-none">K</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-center text-sm font-medium capitalize">
        {styleType}
      </div>
      {isSelected && (
        <CheckCircle2 className="absolute top-1 right-1 h-5 w-5 text-primary bg-white rounded-full" />
      )}
    </div>
  );
};


export function SettingsDialog({ open, onOpenChange, onNewGame }: SettingsDialogProps) {
  const { settings, setSettings } = useSettings();

  const handleSettingChange = (newSettings: Partial<GameSettings>) => {
    setSettings(newSettings);
  };
  
  const handleNewGameClick = () => {
    onOpenChange(false);
    onNewGame();
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const needsNewGame = localStorage.getItem('deck-of-cards-new-game-required') === 'true';
      if (needsNewGame) {
        onNewGame();
        localStorage.removeItem('deck-of-cards-new-game-required');
      }
    }
    onOpenChange(isOpen);
  };

  const handleGameRuleChange = (newSettings: Partial<GameSettings>) => {
    setSettings(newSettings);
    localStorage.setItem('deck-of-cards-new-game-required', 'true');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Changing the game type or rules requires starting a new game. Other settings will apply to your current game.
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
              <Label className="text-right pt-2">Card Style</Label>
              <div className="col-span-3 flex items-center gap-4">
                <CardPreview
                  styleType="modern"
                  isSelected={settings.cardStyle === 'modern'}
                  onClick={() => handleSettingChange({ cardStyle: 'modern' })}
                />
                <CardPreview
                  styleType="classic"
                  isSelected={settings.cardStyle === 'classic'}
                  onClick={() => handleSettingChange({ cardStyle: 'classic' })}
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
                onCheckedChange={(checked) => handleSettingChange({ leftHandMode: checked })}
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
                onCheckedChange={(checked) => handleSettingChange({ autoMove: checked })}
              />
              <Label htmlFor="auto-move">{settings.autoMove ? 'Click to move' : 'Drag to move'}</Label>
            </div>
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleNewGameClick}>New Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
