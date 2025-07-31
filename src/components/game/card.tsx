
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import React from 'react';
import { useSettings } from '@/hooks/use-settings';
import { Crown, Heart, Diamond, Club, Spade } from 'lucide-react';

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


const PipGrid = ({ count, suit }: { count: number, suit: CardType['suit'] }) => {
  if (count < 1 || count > 10) return null;

  // Standard playing card pip arrangements
  const pipStyles: React.CSSProperties[] = [];
  const baseStyle: React.CSSProperties = { position: 'absolute', transform: 'translate(-50%, -50%)' };
  const baseInvertedStyle: React.CSSProperties = { ...baseStyle, transform: 'translate(-50%, -50%) rotate(180deg)' };

  if ([1, 3, 5, 9].includes(count)) {
    pipStyles.push({ ...baseStyle, top: '50%', left: '50%' }); // Center
  }
  if (count >= 2) {
    pipStyles.push({ ...baseStyle, top: '25%', left: '50%' }); // Top-center
    pipStyles.push({ ...baseInvertedStyle, top: '75%', left: '50%' }); // Bottom-center
  }
  if (count === 3) {
    pipStyles[1] = { ...baseStyle, top: '20%', left: '50%' };
    pipStyles[2] = { ...baseInvertedStyle, top: '80%', left: '50%' };
  }
  if (count >= 4) {
    pipStyles[1] = { ...baseStyle, top: '20%', left: '25%' }; // Top-left
    pipStyles[2] = { ...baseInvertedStyle, top: '80%', left: '75%' }; // Bottom-right
    pipStyles.push({ ...baseStyle, top: '20%', left: '75%' }); // Top-right
    pipStyles.push({ ...baseInvertedStyle, top: '80%', left: '25%' }); // Bottom-left
  }
  if (count >= 6) {
    pipStyles.push({ ...baseStyle, top: '50%', left: '25%' }); // Mid-left
    pipStyles.push({ ...baseStyle, top: '50%', left: '75%' }); // Mid-right
  }
  if (count >= 7) {
    // Reposition top-center for 7
    pipStyles[1] = { ...baseStyle, top: '15%', left: '50%' };
    pipStyles[2] = { ...baseInvertedStyle, top: '85%', left: '50%' };
     // remove mid-right for 7
    pipStyles.pop();
    pipStyles[5] = { ...baseStyle, top: '32.5%', left: '50%' };
  }
  if (count === 8) {
    pipStyles[1] = { ...baseStyle, top: '15%', left: '50%' };
    pipStyles[2] = { ...baseInvertedStyle, top: '85%', left: '50%' };
    pipStyles.push({ ...baseInvertedStyle, top: '67.5%', left: '50%' });
  }
  if (count >= 9) {
    // Reposition corners for 9 & 10
    pipStyles[1] = { ...baseStyle, top: '15%', left: '25%' }; // Top-left
    pipStyles[2] = { ...baseInvertedStyle, top: '85%', left: '75%' }; // Bottom-right
    pipStyles[3] = { ...baseStyle, top: '15%', left: '75%' }; // Top-right
    pipStyles[4] = { ...baseInvertedStyle, top: '85%', left: '25%' }; // Bottom-left
  }
  if (count === 10) {
    pipStyles[5] = { ...baseStyle, top: '35%', left: '25%' }; // Mid-left
    pipStyles[6] = { ...baseStyle, top: '35%', left: '75%' }; // Mid-right
    pipStyles.push({ ...baseInvertedStyle, top: '65%', left: '25%' }); // Bottom-mid-left
    pipStyles.push({ ...baseInvertedStyle, top: '65%', left: '75%' }); // Bottom-mid-right
  }

  return (
    <div className="relative h-full w-full">
      {pipStyles.map((style, i) => (
        <div key={i} style={style}>
          <SuitIcon suit={suit} className="text-xl" />
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
    const dominoBack = "bg-red-800 [background-image:radial-gradient(white_1px,_transparent_1px)] [background-size:7px_7px]";
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

    const QueenCrown = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M19.14 6.86a4 4 0 0 0-5.64 0l-1.5 1.5-1.5-1.5a4 4 0 1 0-5.64 5.64L12 19.34l7.14-7.14a4 4 0 0 0 0-5.64z" />
            <circle cx="12" cy="6" r="2"/>
            <circle cx="6" cy="9" r="1.5"/>
            <circle cx="18" cy="9" r="1.5"/>
        </svg>
    )

    const KingCrown = () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <path d="M2 4l3 12h14l3-12-10 6z"/>
      </svg>
    )

    return (
        <div className={cn('relative h-full w-full p-1 bg-white/95', suitColorClass)} style={{color: isRed ? '#AE1447' : 'black'}}>
            {/* Corners */}
            <div className="absolute top-1 left-1 flex flex-col items-center leading-none">
                <div className="font-bold text-lg">{rank}</div>
            </div>
             <div className="absolute top-1 right-1 flex flex-col items-center leading-none">
                <SuitIcon suit={suit} className="text-lg" />
            </div>
            <div className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180">
                <div className="font-bold text-lg">{rank}</div>
            </div>
            <div className="absolute bottom-1 left-1 flex flex-col items-center leading-none rotate-180">
                 <SuitIcon suit={suit} className="text-lg" />
            </div>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                {rankValue <= 10 ? (
                    <PipGrid count={rankValue} suit={suit} />
                ) : (
                    <div className="relative flex flex-col items-center justify-center">
                        {rank === 'K' && <KingCrown />}
                        {rank === 'Q' && <QueenCrown />}
                        <SuitIcon suit={suit} className="text-5xl" />
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
      {cardStyle === 'domino' ? <DominoCardFace /> : <ModernCardFace />}
    </div>
  );
}
