
"use client";

import type { MouseEvent, TouchEvent } from 'react';
import type { GameState as SpiderGameState } from '@/lib/spider';
import { Card as CardType } from '@/lib/solitaire';
import { Card } from './card';
import type { HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';
import { LocatedCard, CardLocation } from '@/lib/game-logic';

interface SpiderBoardProps {
  gameState: SpiderGameState;
  selectedCard: LocatedCard | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (card: CardType | undefined, location: CardLocation) => void;
  handleMouseDown: (e: MouseEvent, card: CardType, location: CardLocation) => void;
  handleTouchStart: (e: TouchEvent, card: CardType, location: CardLocation) => void;
  handleDrop: (location: CardLocation) => void;
  handleDraw: () => void;
}

export default function SpiderBoard(props: SpiderBoardProps) {
  const { settings } = useSettings();
  const gridCols = 'grid-cols-10';
  const dealsLeft = Math.floor(props.gameState.stock.length / 10);

  const DealCounter = () => (
    <div className="col-span-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
        <span>{dealsLeft}/5</span>
    </div>
  );

  return (
    <>
      <div className={`grid ${gridCols} mb-4 gap-x-0`} data-testid="top-piles">
        {settings.leftHandMode ? (
          <>
            <StockPile {...props} />
            <DealCounter />
            <FoundationPiles {...props} />
          </>
        ) : (
          <>
            <FoundationPiles {...props} />
            <DealCounter />
            <StockPile {...props} />
          </>
        )}
      </div>
      <Tableau {...props} gridCols={gridCols} />
    </>
  );
}

const StockPile = ({ gameState, handleDraw }: SpiderBoardProps) => (
  <div onClick={handleDraw} className="col-span-1 cursor-pointer" data-testid="stock-pile">
    <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
  </div>
);

const FoundationPiles = ({ gameState }: SpiderBoardProps) => (
  <div className="col-span-8 grid grid-cols-8 gap-x-0" data-testid="foundation-piles">
   {Array.from({ length: 8 }).map((_, i) => (
     <div key={`foundation-${i}`} data-testid={`foundation-pile-${i}`}>
       <Card 
          card={gameState.foundation[i] ? gameState.foundation[i][gameState.foundation[i].length -1] : undefined}
          data-testid={gameState.foundation[i] ? `card-${gameState.foundation[i][0].suit}-K` : `card-foundation-empty-${i}`}
        />
     </div>
   ))}
 </div>
);
