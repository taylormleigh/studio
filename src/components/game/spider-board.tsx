
"use client";

import type { MouseEvent, TouchEvent } from 'react';
import type { GameState as SpiderGameState, Card as CardType } from '@/lib/spider';
import { canMoveToTableau } from '@/lib/spider';
import { Card } from './card';
import type { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';

interface SpiderBoardProps {
  gameState: SpiderGameState;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau', pileIndex: number, cardIndex: number) => void;
  handleMouseDown: (e: MouseEvent, info: SelectedCardInfo) => void;
  handleTouchStart: (e: TouchEvent, info: SelectedCardInfo) => void;
  handleDraw: () => void;
}

export default function SpiderBoard({ 
  gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDraw
}: SpiderBoardProps) {
  const { settings } = useSettings();

  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
    handleCardClick('tableau', pileIndex, cardIndex);
  };

  const gridCols = 'grid-cols-10';

  const StockPile = () => (
    <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
      <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
    </div>
  );

  const FoundationPiles = () => (
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

  const TableauPiles = () => (
    <div className={`grid ${gridCols} gap-x-0 min-h-[28rem]`} data-testid="tableau-piles">
      {gameState.tableau.map((pile, pileIndex) => (
        <div 
          key={pileIndex} 
          data-testid={`tableau-pile-${pileIndex}`}
          className="relative"
          onClick={() => pile.length === 0 && handleTableauClick(pileIndex, 0)}
        >
          <div className="absolute top-0 left-0 w-full h-full">
            {pile.length === 0 ? (
              <Card data-testid={`card-tableau-empty-${pileIndex}`} isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
            ) : (
              pile.map((card, cardIndex) => {
                const isTopCard = cardIndex === pile.length - 1;
                const draggable = card.faceUp && canMoveToTableau(pile.slice(cardIndex), undefined, true);
                const yOffset = pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 24 : 26) : 10), 0)

                const style = {
                  transform: `translateY(${yOffset}px)`,
                  zIndex: cardIndex
                };

                return (
                  <div 
                    key={`${card.suit}-${card.rank}-${cardIndex}`} 
                    className="absolute w-full"
                    style={style}
                  >
                      <Card
                        card={card}
                        data-testid={`card-${card.suit}-${card.rank}`}
                        isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                        isStacked={card.faceUp && !isTopCard}
                        className={isTopCard ? '' : (card.faceUp ? 'pb-5 sm:pb-6' : 'pb-3')}
                        onMouseDown={(e) => draggable && handleMouseDown(e, { type: 'tableau', pileIndex, cardIndex })}
                        onTouchStart={(e) => draggable && handleTouchStart(e, { type: 'tableau', pileIndex, cardIndex })}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick('tableau', pileIndex, cardIndex);
                        }}
                      />
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className={`grid ${gridCols} mb-4 gap-x-0`} data-testid="top-piles">
        {settings.leftHandMode ? (
          <>
            <StockPile />
            <div className="col-span-1" />
            <FoundationPiles />
          </>
        ) : (
          <>
            <FoundationPiles />
            <div className="col-span-1" />
            <StockPile />
          </>
        )}
      </div>
      <TableauPiles />
    </>
  );
}
