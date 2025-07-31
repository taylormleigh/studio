

"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';

type CardProps = {
  card?: CardType;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isStacked?: boolean; // New prop to indicate if card is not on top
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  style?: React.CSSProperties;
};

// Using Unicode characters for a classic, high-contrast look
const SuitIcon = ({ suit, className, color }: { suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', className?: string, color?: string }) => {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-[#AE1447]' : 'text-black';

  const icons = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  return <span className={cn('font-sans select-none', colorClass, className)} style={{color: isRed ? '#AE1447' : 'black'}}>{icons[suit]}</span>;
}


export function Card({ card, isSelected, isHighlighted, isStacked, className, onClick, draggable, onDragStart, onDragEnd, style }: CardProps) {
  const ringClass = isHighlighted
    ? 'ring-2 ring-offset-background ring-offset-2 ring-green-500'
    : '';
    
  // Responsive card size. Maintains a 7:10 aspect ratio.
  const cardSize = "w-full aspect-[7/10] max-w-[96px]";

  if (!card) {
    return (
      <div
        onClick={onClick}
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
        style={{ 
            backgroundColor: '#5f8fb1',
            backgroundImage: 'radial-gradient(#80ADCC 1px, transparent 1px)',
            backgroundSize: '5px 5px'
        }}
        className={cn(
          cardSize,
          'rounded-md border-2 border-black cursor-pointer transition-all',
          ringClass,
          className
        )}
      >
      </div>
    );
  }

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const suitColorClass = isRed ? 'text-[#AE1447]' : 'text-black';

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        ...style,
        color: isRed ? '#AE1447' : 'black'
      }}
      className={cn(
        cardSize,
        'rounded-md bg-card border-2 border-black cursor-pointer relative p-0.5 sm:p-1 flex flex-col justify-between transition-all duration-300 ease-in-out',
        ringClass,
        suitColorClass,
        className,
        draggable && "cursor-grab"
      )}
    >
      <div className="flex justify-start items-center h-auto">
        <div className="text-base sm:text-lg md:text-lg font-bold leading-none">{card.rank}</div>
        {isStacked && <SuitIcon suit={card.suit} className="text-base sm:text-lg md:text-lg ml-1" />}
      </div>

      {!isStacked && (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <SuitIcon suit={card.suit} className="text-2xl sm:text-3xl md:text-4xl" />
            </div>
            <div className="hidden sm:flex justify-start items-end h-[25%] rotate-180">
                <div className="text-base sm:text-lg md:text-lg font-bold leading-none">{card.rank}</div>
            </div>
         </>
      )}
    </div>
  );
}
