
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

const FaceCardSvg = ({ rank }: { rank: 'J' | 'Q' | 'K' }) => {
  const commonCircle = <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="3" fill="none" />;
  const commonLine = <line x1="30" y1="100" x2="70" y2="100" stroke="currentColor" strokeWidth="3" />;

  switch (rank) {
    case 'J':
      return (
        <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {commonCircle}
          <path d="M 40 65 Q 50 75, 60 65" stroke="currentColor" strokeWidth="3" fill="none" />
          <circle cx="42" cy="45" r="4" fill="currentColor" />
          <circle cx="58" cy="45" r="4" fill="currentColor" />
          {/* Jester Hat */}
          <path d="M 30 25 Q 50 10, 70 25 L 50 50 Z" stroke="currentColor" strokeWidth="3" fill="none" />
        </svg>
      );
    case 'Q':
      return (
        <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {commonCircle}
          <path d="M 40 65 Q 50 70, 60 65" stroke="currentColor" strokeWidth="3" fill="none" />
          <circle cx="42" cy="45" r="4" fill="currentColor" />
          <circle cx="58" cy="45" r="4" fill="currentColor" />
          {/* Queen's Crown */}
          <path d="M 25 30 L 35 20 L 50 25 L 65 20 L 75 30" stroke="currentColor" strokeWidth="3" fill="none" />
          <circle cx="35" cy="20" r="3" fill="currentColor" />
          <circle cx="50" cy="25" r="3" fill="currentColor" />
          <circle cx="65" cy="20" r="3" fill="currentColor" />
        </svg>
      );
    case 'K':
      return (
        <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {commonCircle}
          <path d="M 40 60 Q 50 55, 60 60" stroke="currentColor" strokeWidth="3" fill="none" />
          <circle cx="42" cy="45" r="4" fill="currentColor" />
          <circle cx="58" cy="45" r="4" fill="currentColor" />
          {/* King's Crown with cross */}
          <path d="M 25 30 L 35 20 L 50 25 L 65 20 L 75 30" stroke="currentColor" strokeWidth="3" fill="none" />
          <line x1="50" y1="25" x2="50" y2="15" stroke="currentColor" strokeWidth="3" />
          <line x1="45" y1="20" x2="55" y2="20" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    default:
      return null;
  }
};


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
            
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
            {isFaceCard ? (
                <div className="w-full h-full">
                  <FaceCardSvg rank={rank as 'J' | 'Q' | 'K'} />
                </div>
            ) : (
                <div className="text-5xl">
                   <SuitIcon suit={suit} />
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
