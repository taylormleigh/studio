
"use client";

import * as React from 'react';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { CardPreview } from './card-preview';


interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, setSettings } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
            <DialogTitle className="text-xs">
              a deck of cards
            </DialogTitle>
            <h1>Settings</h1>
            <DialogDescription className="text-xs">
              Settings related to gameplay and appearance. Changes are applied immediately.
            </DialogDescription>
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
      </DialogContent>
    </Dialog>
  );
}
