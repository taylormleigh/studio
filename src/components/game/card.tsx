
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';
import { useSettings } from '@/hooks/use-settings';
import Image from 'next/image';

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
const SuitIcon = ({ suit, className }: { suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', className?: string }) => {
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
        'relative p-1 flex flex-col justify-between h-full',
        suitColorClass
      )}
      style={{color: isRed ? '#AE1447' : 'black'}}
    >
      <div className="flex items-center">
        <div className="text-lg font-bold leading-none">{card.rank}</div>
      </div>

      <div className="self-center">
        <SuitIcon suit={card.suit} className="text-xl" />
      </div>

      <div className="flex items-center self-end rotate-180">
        <div className="text-lg font-bold leading-none">{card.rank}</div>
      </div>
    </div>
  );

  const ClassicCardFace = () => {
    const rank = card.rank;
    const suit = card.suit;
    const isFaceCard = ['K', 'Q', 'J'].includes(rank);
    const rankValue = parseInt(rank, 10);

    const pipLayouts: { [key: number]: string[] } = {
        1: ['center-center'],
        2: ['top-center', 'bottom-center'],
        3: ['top-center', 'center-center', 'bottom-center'],
        4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        5: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center-center'],
        6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
        7: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right', 'center-top'],
        8: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right', 'center-top', 'center-bottom'],
        9: ['top-left', 'top-right', 'mid-top-left', 'mid-top-right', 'center-center', 'mid-bottom-left', 'mid-bottom-right', 'bottom-left', 'bottom-right'],
        10: ['top-left', 'top-right', 'mid-top-left', 'mid-top-right', 'center-top', 'center-bottom', 'mid-bottom-left', 'mid-bottom-right', 'bottom-left', 'bottom-right'],
    };
    
    const pips = rank === 'A' ? pipLayouts[1] : (rankValue >= 2 && rankValue <= 10) ? pipLayouts[rankValue] : [];

    const pipGridClasses: { [key: string]: string } = {
        'center-center': 'col-start-2 row-start-3',
        'top-center': 'col-start-2 row-start-1',
        'bottom-center': 'col-start-2 row-start-5 rotate-180',
        'top-left': 'col-start-1 row-start-1',
        'top-right': 'col-start-3 row-start-1',
        'bottom-left': 'col-start-1 row-start-5 rotate-180',
        'bottom-right': 'col-start-3 row-start-5 rotate-180',
        'mid-left': 'col-start-1 row-start-3',
        'mid-right': 'col-start-3 row-start-3',
        'center-top': 'col-start-2 row-start-2',
        'center-bottom': 'col-start-2 row-start-4 rotate-180',
        'mid-top-left': 'col-start-1 row-start-2',
        'mid-top-right': 'col-start-3 row-start-2',
        'mid-bottom-left': 'col-start-1 row-start-4 rotate-180',
        'mid-bottom-right': 'col-start-3 row-start-4 rotate-180'
    };

    return (
        <div className='relative h-full p-1 bg-white/80' style={{ fontFamily: "'Tinos', serif"}}>
            {/* Corner Ranks */}
            <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
                <div className="font-bold text-lg">{rank}</div>
                <SuitIcon suit={suit} className="text-base" />
            </div>
            <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180">
                <div className="font-bold text-lg">{rank}</div>
                <SuitIcon suit={suit} className="text-base" />
            </div>
            
            {/* Pips and Face Cards */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
            {isFaceCard ? (
                <div className="w-full h-full p-2">
                     <Image src={`https://placehold.co/120x180.png`} alt={`${rank} of ${suit}`} layout="fill" objectFit="contain" data-ai-hint="playing card illustration"/>
                </div>
            ) : (
                <div className="grid grid-cols-3 grid-rows-5 w-full h-full text-2xl">
                    {pips.map(pos => (
                        <div key={pos} className={cn('flex items-center justify-center', pipGridClasses[pos])}>
                           <SuitIcon suit={suit} className={cn(rank === 'A' && 'text-5xl')}/>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
  }

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
        isSelected && (cardStyle === 'modern' ? 'ring-2 ring-blue-500' : 'ring-2 ring-offset-2 ring-yellow-400'),
        draggable && "cursor-grab"
      )}
    >
      {cardStyle === 'classic' ? <ClassicCardFace /> : <ModernCardFace />}
    </div>
  );
}
