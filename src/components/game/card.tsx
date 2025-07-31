
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';

const SuitIcon = ({ suit, className }: { suit: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS', className?: string }) => {
  const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
  const colorClass = isRed ? 'text-[#dc2626]' : 'text-card-foreground';

  const icons = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  return <span className={cn('select-none', colorClass, className)}>{icons[suit]}</span>;
}

export function Card({ card, isSelected, isHighlighted, className, onClick, draggable, onDragStart, onDragEnd, style, isStacked }: CardProps) {
  const { settings } = useSettings();
  const { cardStyle } = settings;

  const ringClass = isHighlighted
    ? (cardStyle === 'domino' ? 'ring-2 ring-offset-background ring-offset-2 ring-yellow-400' : 'ring-2 ring-offset-background ring-offset-2 ring-green-500')
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
    const modernBack = "bg-[#5f8fb1] [background-image:repeating-linear-gradient(45deg,_#80ADCC,_#80ADCC_1px,_transparent_1px,_transparent_5px)] [background-size:5px_5px]";
    const dominoBack = "bg-[#9FC756] [background-image:repeating-linear-gradient(45deg,#D6E444,#D6E444_1px,transparent_1px,transparent_5px)]";

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
  const suitColorClass = isRed ? 'text-[#dc2626]' : 'text-card-foreground';

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
      <div
        className={cn(
          'relative p-1 flex flex-col justify-between h-full',
          suitColorClass
        )}
      >
        <div className="flex items-center gap-1">
          <div className="text-lg font-bold leading-none">{card.rank}</div>
          {isStacked && <SuitIcon suit={card.suit} className="text-md leading-none" />}
        </div>

        {!isStacked && (
          <>
            <div className="self-center">
              <SuitIcon suit={card.suit} className="text-xl" />
            </div>
            <div className="hidden xs:flex md:hidden lg:flex items-center self-end rotate-180">
              <div className="text-lg font-bold leading-none">{card.rank}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
