"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';

type CardProps = {
  card?: CardType;
  isSelected?: boolean;
  isHinted?: boolean;
  className?: string;
  onClick?: () => void;
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


export function Card({ card, isSelected, isHinted, className, onClick }: CardProps) {
  const ringClass = isSelected 
    ? 'ring-2 ring-offset-background ring-offset-2 ring-blue-500' 
    : isHinted 
    ? 'ring-2 ring-offset-background ring-offset-2 ring-green-500' 
    : '';

  if (!card) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'w-24 h-36 rounded-md bg-muted/60 border-2 border-dashed border-muted-foreground/40 transition-all',
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
          'w-24 h-36 rounded-md bg-blue-700 border-2 border-black cursor-pointer transition-all',
          'flex items-center justify-center p-1',
          ringClass,
          className
        )}
      >
        <div className="w-full h-full rounded border-2 border-blue-900 bg-blue-800" />
      </div>
    );
  }

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const suitColorClass = isRed ? 'text-red-600' : 'text-black';

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-24 h-36 rounded-md bg-card border-2 border-black cursor-pointer relative p-1 flex flex-col justify-between transition-all',
        ringClass,
        suitColorClass,
        className
      )}
    >
      <div className="h-6">
        <div className="text-xl font-bold leading-none text-left">{card.rank}</div>
        <SuitIcon suit={card.suit} className="text-lg leading-none" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
         <SuitIcon suit={card.suit} className="text-6xl opacity-90" />
      </div>
      <div className="h-6 rotate-180">
        <div className="text-xl font-bold leading-none text-left">{card.rank}</div>
        <SuitIcon suit={card.suit} className="text-lg leading-none" />
      </div>
    </div>
  );
}
