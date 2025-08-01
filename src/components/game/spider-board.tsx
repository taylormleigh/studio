
"use client";

import { DragEvent } from 'react';
import { GameState as SpiderGameState, canMoveToTableau } from '@/lib/spider';
import { Card } from './card';
import { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

interface SpiderBoardProps {
  gameState: SpiderGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau', pileIndex: number, cardIndex: number) => void;
  handleDragStart: (e: DragEvent, info: SelectedCardInfo) => void;
  handleDrop: (e: DragEvent, type: 'tableau', pileIndex: number) => void;
  handleDraw: () => void;
}

export default function SpiderBoard({ 
  gameState, selectedCard, highlightedPile, handleCardClick, handleDragStart, handleDrop, handleDraw
}: SpiderBoardProps) {
  const { settings } = useSettings();

  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
    handleCardClick('tableau', pileIndex, cardIndex);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const gridCols = 'grid-cols-10';

  const StockPile = () => (
    <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
      <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} />
    </div>
  );

  const FoundationPiles = () => (
    <div className="col-span-8 grid grid-cols-8 gap-x-0" data-testid="foundation-piles">
     {Array.from({ length: 8 }).map((_, i) => (
       <div key={`foundation-${i}`} data-testid={`foundation-pile-${i}`}>
         <Card card={gameState.foundation[i] ? gameState.foundation[i][gameState.foundation[i].length -1] : undefined} />
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
      <div className={`grid ${gridCols} gap-x-0 min-h-[28rem]`} data-testid="tableau-piles">
        {gameState.tableau.map((pile, pileIndex) => (
          <div 
            key={pileIndex} 
            data-testid={`tableau-pile-${pileIndex}`}
            className="relative"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            onClick={() => pile.length === 0 && handleTableauClick(pileIndex, 0)}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              {pile.length === 0 ? (
                <Card data-testid={`tableau-empty-${pileIndex}`} isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
              ) : (
                pile.map((card, cardIndex) => {
                  const isTopCard = cardIndex === pile.length - 1;
                  const yOffset = pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 24 : 26) : 10), 0)

                  return (
                    <div 
                      key={`${card.suit}-${card.rank}-${cardIndex}`} 
                      className="absolute w-full"
                      style={{
                        transform: `translateY(${yOffset}px)`,
                        zIndex: cardIndex
                      }}
                    >
                        <Card
                          card={card}
                          data-testid={`card-${card.suit}-${card.rank}`}
                          isSelected={selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex}
                          isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                          draggable={card.faceUp && canMoveToTableau(pile.slice(cardIndex), undefined, true)}
                          isStacked={card.faceUp && !isTopCard}
                          className={isTopCard ? '' : (card.faceUp ? 'pb-5 sm:pb-6' : 'pb-3')}
                          onDragStart={(e) => card.faceUp && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                          onClick={(e) => {
                              e.stopPropagation();
                              handleTableauClick(pileIndex, cardIndex);
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
    </>
  );
}
