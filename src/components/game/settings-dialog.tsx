
"use client";

import * as React from 'react';
import { useSettings } from '@/hooks/use-settings';
import { useStats } from '@/hooks/use-stats';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { CardPreview } from './card-preview';
import { Download, VenetianMask } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import type { GameState } from '@/lib/game-logic';
import { log } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showVictoryDialog: () => void;
  loadDebugState: (state: GameState) => void;
}

export function SettingsDialog({ open, onOpenChange, showVictoryDialog, loadDebugState }: SettingsDialogProps) {
  const { settings, setSettings, installable, handleInstallPrompt, isDevMode, setIsDevMode } = useSettings();
  const { stats, resetStats } = useStats();
  const { toast } = useToast();
  const [titleClickCount, setTitleClickCount] = React.useState(0);
  const [debugStateJson, setDebugStateJson] = React.useState('');

  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);
    if (newCount >= 5) {
      const newDevMode = !isDevMode;
      setIsDevMode(newDevMode);
      setTitleClickCount(0); // Reset counter
      toast({ title: `Developer Mode ${newDevMode ? 'Enabled' : 'Disabled'}` });
    }
  };

  const handleLoadDebugState = () => {
    try {
      const parsedState = JSON.parse(debugStateJson);
      // Basic validation
      if (parsedState.gameType && Array.isArray(parsedState.tableau)) {
        loadDebugState(parsedState);
        onOpenChange(false); // Close dialog on success
      } else {
        throw new Error("Invalid game state object.");
      }
    } catch (error) {
      log('Failed to parse or load debug state', error);
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "The provided text is not a valid game state JSON object.",
      });
    }
  };

  const handleResetStats = () => {
    const gameType = settings.gameType;
    if (window.confirm(`Are you sure you want to reset all stats for ${gameType}? This cannot be undone.`)) {
      resetStats(gameType);
      toast({ title: `${gameType} stats have been reset.` });
    }
  };

  // When the dialog opens, reset the click counter
  React.useEffect(() => {
    if (open) {
      setTitleClickCount(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="settings-dialog">
        <DialogHeader>
          <DialogTitle className="text-xs" onClick={handleTitleClick}>
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
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
                <Label htmlFor="auto-move">{settings.autoMove ? 'Auto-move on click' : 'Drag or Click'}</Label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="animation-mode" className="text-right">
                Animation
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="animation-mode"
                  checked={settings.animationMode === 'full'}
                  onCheckedChange={(checked) => setSettings({ animationMode: checked ? 'full' : 'limited' })}
                />
                <Label htmlFor="animation-mode">{settings.animationMode === 'full' ? 'Show animation' : 'Limit animation'}</Label>
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

            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Color</Label>
                <RadioGroup
                  value={settings.colorMode}
                  onValueChange={(value) => setSettings({ colorMode: value as 'color' | 'greyscale' })}
                  className="col-span-3 flex items-center gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="color" id="color-mode-color" />
                        <Label htmlFor="color-mode-color">
                          Color
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="greyscale" id="color-mode-greyscale" />
                        <Label htmlFor="color-mode-greyscale">
                          Greyscale
                        </Label>
                    </div>
                </RadioGroup>
            </div>
        </div>

        {isDevMode && (
          <>
            <hr/>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                  <VenetianMask className="h-5 w-5" />
                  <h3>Developer Options</h3>
                </div>
                <Button className="m-0 px-4 text-xs" onClick={() => setIsDevMode(false)} variant="outline">X</Button>
              </div>
              <div className="text-xs text-muted-foreground m-0">
                Last Build: {process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || 'N/A'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <Button onClick={showVictoryDialog} variant="outline">Show Victory Screen</Button>
                  <Button onClick={handleResetStats} variant="destructive">Reset Stats</Button>
              </div>
               <div className="grid gap-2">
                  <Label htmlFor="debug-state-json">Load Game State</Label>
                  <Textarea
                    id="debug-state-json"
                    placeholder='Paste game state JSON here...'
                    value={debugStateJson}
                    onChange={(e) => setDebugStateJson(e.target.value)}
                    className="h-24 font-code text-xs"
                  />
                  <Button onClick={handleLoadDebugState} variant="outline">Load State & Start New Game</Button>
              </div>
             
            </div>
          </>
        )}

        {installable && !isDevMode && (
          <>
            <svg viewBox="0 0 1100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,50 C300,0 900,170 1100,60" stroke="currentColor" fill="none" strokeWidth="6"/>
            </svg>

            <div className="grid grid-cols-1 pt-4">
              <Button onClick={handleInstallPrompt} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Install App to Device
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
