
"use client";

import * as React from 'react';
import { useSettings, type GameSettings } from '@/hooks/use-settings';
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
import { Download } from 'lucide-react';


interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, setSettings, installable, handleInstallPrompt } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="settings-dialog">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
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

            {installable && (
              <>
                <svg viewBox="0 0 1100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,50 C300,0 900,170 1100,60" stroke="currentColor" fill="none" strokeWidth="6"/>
                </svg>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right"></Label>
                    <div className="col-span-3">
                        <Button onClick={handleInstallPrompt} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Install App
                        </Button>
                    </div>
                </div>
              </>
             )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
