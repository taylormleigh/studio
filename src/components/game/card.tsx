
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';

type CardProps = {
  card?: CardType;
  isSelected?: boolean;
  isStacked?: boolean; // New prop to indicate if card is not on top
  className?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
};

// Using Unicode characters for a classic, high-contrast look
const SuitIcon = ({ suit, className }: { suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', className?: string }) => {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-red-600' : 'text-black';

  const icons = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  return <span className={cn('font-sans select-none', colorClass, className)}>{icons[suit]}</span>;
}


export function Card({ card, isSelected, isStacked, className, onClick, draggable, onDragStart, onDragEnd }: CardProps) {
  const ringClass = isSelected 
    ? 'ring-2 ring-offset-background ring-offset-2 ring-blue-500'
    : '';
    
  // Responsive card size. Maintains a 7:10 aspect ratio.
  const cardSize = "w-full aspect-[7/10] max-w-[96px]";

  if (!card) {
    return (
      <div
        className={cn(
          cardSize,
          'rounded-md bg-muted/60 border-2 border-dashed border-muted-foreground/40 transition-all',
          ringClass,
          className
        )}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        className={cn(
          cardSize,
          'rounded-md bg-blue-700 border-2 border-black cursor-pointer transition-all',
          'flex items-center justify-center p-1',
          ringClass,
          className
        )}
      >
        <div className="w-full h-full rounded-sm border-2 border-blue-900 bg-blue-800" />
      </div>
    );
  }

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const suitColorClass = isRed ? 'text-red-600' : 'text-black';

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        cardSize,
        'rounded-md bg-card border-2 border-black cursor-pointer relative p-0.5 sm:p-1 flex flex-col justify-between transition-all overflow-hidden',
        ringClass,
        suitColorClass,
        className,
        draggable && "cursor-grab"
      )}
    >
      <div className="flex justify-start items-center h-auto">
        <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-none">{card.rank}</div>
        {isStacked && <SuitIcon suit={card.suit} className="text-xl sm:text-2xl md:text-3xl ml-1" />}
      </div>

      {!isStacked && (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <SuitIcon suit={card.suit} className="text-4xl sm:text-5xl md:text-6xl" />
            </div>
            <div className="flex justify-start items-end h-[25%] rotate-180">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-none">{card.rank}</div>
            </div>
         </>
      )}
    </div>
  );
}
