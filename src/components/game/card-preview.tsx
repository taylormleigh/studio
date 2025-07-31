
"use client";

import { cn } from '@/lib/utils';
import type { CardStyle } from '@/hooks/use-settings';
import { CheckCircle2, Moon, Sun } from 'lucide-react';

export const CardPreview = ({
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
          'relative cursor-pointer rounded-lg border-2 p-3 transition-all w-16 h-14 flex flex-col items-center justify-center gap-1',
          isSelected ? 'border-primary' : 'border-border',
          isDomino ? 'bg-black text-white' : 'bg-gray-100 text-black'
        )}
      >
        {isDomino ? <Moon /> : <Sun className="text-black"/>}
        <div className={cn("text-center text-sm font-medium capitalize", isDomino ? 'text-white' : 'text-black')}>
        </div>
        {isSelected && (
          <CheckCircle2 className={cn("absolute top-1 right-1 h-4 w-4 rounded-full", isDomino ? "text-black bg-white" : "text-primary bg-white")} />
        )}
      </div>
    );
  };
