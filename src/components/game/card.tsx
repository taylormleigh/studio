
"use client";

import type { Card as CardType } from '@/lib/solitaire';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';
import { SuitIcon } from './suit-icon';

export function Card({ card, isSelected, isHighlighted, className, onClick, onMouseDown, onMouseUp, onTouchStart, onTouchEnd, style, isStacked, "data-testid": dataTestId = 'card-undefined' }: CardProps) {
  const { settings } = useSettings();
  const { cardStyle } = settings;

  const ringClass = isHighlighted
    ? (cardStyle === 'domino' ? 'ring-2 ring-offset-background ring-offset-2 ring-yellow-400' : 'ring-2 ring-offset-background ring-offset-2 ring-green-500')
    : '';
    
  const cardSize = "w-full aspect-[7/10] max-w-[96px]";
  const baseClasses = cn(
    cardSize,
    'rounded-md transition-all card-border',
    isSelected ? 'ring-2 ring-primary' : '', 
    ringClass,
    className
  );


  if (!card) {
    return (
      <div
        onClick={onClick}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        data-testid={dataTestId}
        className={cn(
          baseClasses,
          'bg-muted/40 border-dashed border-muted-foreground/70'
        )}
      />
    );
  }

  if (!card.faceUp) {
    const { settings } = useSettings();
    const isGreyscaleMode = settings.colorMode === 'greyscale';
    const modernBack = isGreyscaleMode ? "light-grey-card-bg" : "light-color-card-bg";
    const dominoBack = isGreyscaleMode ? "dark-grey-card-bg" : "dark-color-card-bg";

    return (
      <div
        onClick={onClick}
        data-testid={dataTestId}
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
  const suitColorClass = isRed ? 'text-[#ff5555]' : 'text-[#000000]';

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={style}
      data-testid={dataTestId}
      className={cn(
        baseClasses,
        'bg-card border-black cursor-pointer relative duration-300 ease-in-out'
      )}
    >
      <div
        className={cn(
          'relative p-1 flex flex-col justify-between h-full',
          suitColorClass
        )}
      >
        <div className="flex items-center gap-1">
          {/* stacked face up card rank */}
          <div className="sm:text-md md:text-md font-bold leading-none">
            {card.rank}
          </div>

          {/* stacked face up card suite icon */}
          {isStacked && <SuitIcon suit={card.suit} className="card-suite-icon-corner text-lg sm:text-md xs:text-md" />}
        </div>

        {!isStacked && (
          <>
            {/* top card suite icon */}
            <div className="self-center flex">
              <SuitIcon suit={card.suit} className="card-suite-icon-center text-2xl" />
            </div>
            <div>
              {/* lower right-hand rank */}
              <div className="hidden xs:hidden md:flex self-end rotate-180">
                <div className="sm:text-md md:text-md font-bold leading-none">
                  {card.rank}
                </div>
              </div>
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
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  "data-testid"?: string;
};
