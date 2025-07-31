

"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';
import { useSettings } from '@/hooks/use-settings';

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
  const { settings } = useSettings();
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-[#AE1447]' : 'text-black';
  const fontFamily = settings.cardStyle === 'classic' ? "font-['Tinos',_serif]" : "font-sans";

  const icons = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  return <span className={cn('select-none', fontFamily, colorClass, className)} style={{color: isRed ? '#AE1447' : 'black'}}>{icons[suit]}</span>;
}


export function Card({ card, isSelected, isHighlighted, isStacked, className, onClick, draggable, onDragStart, onDragEnd, style }: CardProps) {
  const { settings } = useSettings();
  const { cardStyle } = settings;

  const ringClass = isHighlighted
    ? 'ring-2 ring-offset-background ring-offset-2 ring-green-500'
    : '';
    
  // Responsive card size. Maintains a 7:10 aspect ratio.
  const cardSize = "w-full aspect-[7/10] max-w-[96px]";
  const baseClasses = cn(
    cardSize,
    'rounded-md transition-all border-2',
    ringClass,
    className
  );


  if (!card) {
    return (
      <div
        onClick={onClick}
        className={cn(
          baseClasses,
          'bg-muted/60 border-dashed border-muted-foreground/40'
        )}
      />
    );
  }

  if (!card.faceUp) {
    const modernBack = "bg-[#5f8fb1] [background-image:radial-gradient(#80ADCC_1px,_transparent_1px)] [background-size:5px_5px]";
    const classicBack = "bg-[#000080]"; // Simple blue for classic look
    return (
      <div
        onClick={onClick}
        className={cn(
          baseClasses,
          'cursor-pointer border-black',
          cardStyle === 'classic' ? classicBack : modernBack
        )}
      >
      </div>
    );
  }

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const suitColorClass = isRed ? 'text-[#AE1447]' : 'text-black';

  const ModernCardFace = () => (
    <div
      className={cn(
        'relative p-0.5 sm:p-1 md:p-px flex flex-col justify-between h-full',
        suitColorClass,
      )}
      style={{color: isRed ? '#AE1447' : 'black'}}
    >
      <div className="absolute top-1 left-1 flex items-center h-auto">
        <div className="text-base sm:text-lg md:text-base font-bold leading-none">{card.rank}</div>
        {isStacked && <SuitIcon suit={card.suit} className="text-base sm:text-lg md:text-base" />}
      </div>

      {!isStacked && (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <SuitIcon suit={card.suit} className="text-xl sm:text-xl md:text-lg" />
            </div>
         </>
      )}
    </div>
  );

  const ClassicCardFace = () => (
    <div className='relative h-full p-1' style={{ fontFamily: "'Tinos', serif"}}>
        <div className="flex flex-col items-center absolute top-1 left-1">
            <div className="font-bold text-lg leading-none text-black">{card.rank}</div>
            <SuitIcon suit={card.suit} className="text-lg leading-none" />
        </div>
    </div>
  )

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={style}
      className={cn(
        baseClasses,
        'bg-card border-black cursor-pointer relative duration-300 ease-in-out',
        draggable && "cursor-grab"
      )}
    >
      {cardStyle === 'classic' ? <ClassicCardFace /> : <ModernCardFace />}
    </div>
  );
}
