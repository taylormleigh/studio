
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';
import { useSettings } from '@/hooks/use-settings';

type CardProps = {
  card?: CardType;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isStacked?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  style?: React.CSSProperties;
};

const SuitIcon = ({ suit, className }: { suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', className?: string }) => {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-[#AE1447]' : 'text-black';

  const icons = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  return <span className={cn('select-none', colorClass, className)} style={{color: isRed ? '#AE1447' : 'black'}}>{icons[suit]}</span>;
}

const RANK_VALUES: { [key: string]: number } = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

const Pip = () => <div className="w-3 h-3 bg-black rounded-full" />;

const PipGrid = ({ count }: { count: number }) => {
  const grids: { [key: number]: string[] } = {
    1: ["center"],
    2: ["start", "end"],
    3: ["start", "center", "end"],
    4: ["grid-cols-2", "grid-cols-2"],
    5: ["grid-cols-2", "center", "grid-cols-2"],
    6: ["grid-cols-2", "grid-cols-2", "grid-cols-2"],
    7: ["grid-cols-2", "center", "grid-cols-2", "grid-cols-2"],
    8: ["grid-cols-2", "center", "grid-cols-2", "center", "grid-cols-2"],
    9: ["grid-cols-2", "grid-cols-2", "center", "grid-cols-2", "grid-cols-2"],
    10: ["grid-cols-2", "center", "grid-cols-2", "center", "grid-cols-2", "center", "grid-cols-2"],
  };

  const renderPips = (layout: string) => {
    if (layout === 'center') return <div className="col-span-2 flex justify-center items-center"><Pip /></div>;
    const pipCount = layout === 'grid-cols-2' ? 2 : 0;
    return Array.from({ length: pipCount }).map((_, i) => <div key={i} className="flex justify-center items-center"><Pip /></div>);
  };
  
  if (count > 10) return null; // Handle face cards separately

  return (
    <div className="h-full w-full p-1 flex flex-col justify-between">
      {grids[count]?.map((layout, i) => (
         <div key={i} className={`grid ${layout} w-full`}>
           {renderPips(layout)}
         </div>
      ))}
    </div>
  );
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
    const dominoBack = "bg-[#2c3e50]";
    return (
      <div
        onClick={onClick}
        className={cn(
          baseClasses,
          'cursor-pointer border-black',
          cardStyle === 'domino' ? dominoBack : modernBack
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

  const DominoCardFace = () => {
    const rank = card.rank;
    const suit = card.suit;
    const rankValue = RANK_VALUES[rank];

    const topPips = Math.floor(rankValue / 2);
    const bottomPips = rankValue - topPips;

    return (
        <div className='relative h-full p-1 bg-white/80'>
            <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
                <div className="font-bold text-lg">{rank}</div>
                <SuitIcon suit={suit} className="text-base" />
            </div>
            <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180">
                <div className="font-bold text-lg">{rank}</div>
                <SuitIcon suit={suit} className="text-base" />
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <div className="w-full h-1/2 flex items-center justify-center">
                    <PipGrid count={topPips} />
                </div>
                <div className="h-[2px] w-10/12 bg-black/80 my-1"></div>
                <div className="w-full h-1/2 flex items-center justify-center">
                   <PipGrid count={bottomPips} />
                </div>
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
      {cardStyle === 'domino' ? <DominoCardFace /> : <ModernCardFace />}
    </div>
  );
}
