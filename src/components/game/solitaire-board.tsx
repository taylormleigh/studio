
"use client";

import { DragEvent } from 'react';
import { GameState as SolitaireGameState, isRun as isSolitaireRun, last } from '@/lib/solitaire';
import { Card } from './card';
import { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

interface SolitaireBoardProps {
  gameState: SolitaireGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleDragStart: (e: DragEvent, info: SelectedCardInfo) => void;
  handleDrop: (e: DragEvent, type: 'tableau' | 'foundation', pileIndex: number) => void;
  handleDraw: () => void;
  moveCards: (sourceType: 'tableau' | 'waste' | 'foundation', sourcePileIndex: number, sourceCardIndex: number, destType: 'tableau' | 'foundation', destPileIndex: number) => void;
}

export default function SolitaireBoard({ 
  gameState, selectedCard, highlightedPile, handleCardClick, handleDragStart, handleDrop, handleDraw, moveCards
}: SolitaireBoardProps) {
  const { settings } = useSettings();

  const handleFoundationClick = (pileIndex: number) => {
    if (selectedCard) {
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'foundation', pileIndex);
    }
  };
  
  const handleTableauClick = (pileIndex: number) => {
    if (selectedCard) {
      if(selectedCard.type === 'tableau' && selectedCard.pileIndex === pileIndex) {
        // Deselect if clicking same pile
      } else {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'tableau', pileIndex);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const StockAndWaste = () => (
    <>
      {settings.leftHandMode ? (
        <>
          <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
            <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} />
          </div>
          <div data-testid="waste-pile">
            {gameState.waste.length > 0 ? (
              <Card 
                card={last(gameState.waste)} 
                isSelected={selectedCard?.type === 'waste'}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
              />
            ) : <Card onClick={handleDraw}/>}
          </div>
        </>
      ) : (
         <>
          <div data-testid="waste-pile">
            {gameState.waste.length > 0 ? (
              <Card 
                card={last(gameState.waste)} 
                isSelected={selectedCard?.type === 'waste'}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
              />
            ) : <Card onClick={handleDraw}/>}
          </div>
          <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
            <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} />
          </div>
        </>
      )}
    </>
  );

  const FoundationPiles = () => (
    <div className="flex col-span-4 justify-end gap-x-[clamp(2px,1vw,4px)]">
      {gameState.foundation.map((pile, i) => (
        <div 
          key={i} 
          data-testid={`foundation-pile-${i}`}
          className="w-full max-w-[96px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'foundation', i)}
          onClick={() => handleFoundationClick(i)}
        >
          <Card 
            card={last(pile)}
            isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
            draggable={pile.length > 0}
            onDragStart={(e) => pile.length > 0 && handleDragStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-7 gap-x-[clamp(2px,1vw,4px)] mb-4" data-testid="top-piles">
        {settings.leftHandMode ? (
          <>
            <StockAndWaste />
            <div className="col-span-1" />
            <FoundationPiles />
          </>
        ) : (
          <>
            <FoundationPiles />
            <div className="col-span-1" />
            <StockAndWaste />
          </>
        )}
      </div>
      <div className="grid grid-cols-7 gap-x-[clamp(2px,1vw,4px)] min-h-[28rem]" data-testid="tableau-piles">
        {gameState.tableau.map((pile, pileIndex) => (
          <div 
            key={pileIndex} 
            data-testid={`tableau-pile-${pileIndex}`}
            className="relative"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            onClick={() => pile.length === 0 && handleTableauClick(pileIndex)}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              {pile.length === 0 ? (
                <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
              ) : (
                pile.map((card, cardIndex) => {
                  const isTopCard = cardIndex === pile.length - 1;
                  const isSelected = selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex;
                  const draggable = card.faceUp && isSolitaireRun(pile.slice(cardIndex));
                  
                  return (
                    <div 
                      key={`${card.suit}-${card.rank}-${cardIndex}`} 
                      className="absolute w-full" 
                    >
                      <div className={cn(
                        "relative w-full",
                         card.faceUp ? "h-5 sm:h-6" : "h-3"
                        )}
                        style={{
                           transform: `translateY(${pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 22 : 24) : 10), 0)}px)`
                        }}
                      >
                        <Card
                          card={card}
                          isSelected={isSelected}
                          isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                          draggable={draggable}
                          isStacked={card.faceUp && !isTopCard}
                          onDragStart={(e) => draggable && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
                          onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick('tableau', pileIndex, cardIndex);
                          }}
                        />
                      </div>
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
