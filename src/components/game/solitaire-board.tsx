
"use client";

import { MouseEvent, TouchEvent } from 'react';
import { GameState as SolitaireGameState, isRun as isSolitaireRun, last } from '@/lib/solitaire';
import { Card } from './card';
import { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';

interface SolitaireBoardProps {
  gameState: SolitaireGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleMouseDown: (e: MouseEvent, info: SelectedCardInfo) => void;
  handleTouchStart: (e: TouchEvent, info: SelectedCardInfo) => void;
  handleDraw: () => void;
  moveCards: (sourceType: 'tableau' | 'waste' | 'foundation', sourcePileIndex: number, sourceCardIndex: number, destType: 'tableau' | 'foundation', destPileIndex: number) => void;
}

export default function SolitaireBoard({ 
  gameState, selectedCard, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDraw, moveCards
}: SolitaireBoardProps) {
  const { settings } = useSettings();

  const handleFoundationClick = (pileIndex: number) => {
    if (selectedCard) {
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'foundation', pileIndex);
    }
  };
  
  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
    handleCardClick('tableau', pileIndex, cardIndex);
  };

  const StockAndWaste = () => (
    <>
      {settings.leftHandMode ? (
        <>
          <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
            <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
          </div>
          <div data-testid="waste-pile">
            {gameState.waste.length > 0 ? (
              <Card 
                card={last(gameState.waste)} 
                data-testid={`card-${last(gameState.waste)?.suit}-${last(gameState.waste)?.rank}`}
                isSelected={selectedCard?.type === 'waste'}
                onMouseDown={(e) => handleMouseDown(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onTouchStart={(e) => handleTouchStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
              />
            ) : <Card onClick={handleDraw} data-testid="card-waste-empty" />}
          </div>
        </>
      ) : (
         <>
          <div data-testid="waste-pile">
            {gameState.waste.length > 0 ? (
              <Card 
                card={last(gameState.waste)} 
                data-testid={`card-${last(gameState.waste)?.suit}-${last(gameState.waste)?.rank}`}
                isSelected={selectedCard?.type === 'waste'}
                onMouseDown={(e) => handleMouseDown(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onTouchStart={(e) => handleTouchStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
              />
            ) : <Card onClick={handleDraw} data-testid="card-waste-empty" />}
          </div>
          <div onClick={handleDraw} className="cursor-pointer" data-testid="stock-pile">
            <Card card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
          </div>
        </>
      )}
    </>
  );

  const FoundationPiles = () => (
    <div className="flex col-span-4 justify-end gap-x-[clamp(2px,1vw,4px)]" data-testid="foundation-piles">
      {gameState.foundation.map((pile, i) => (
        <div 
          key={i} 
          data-testid={`foundation-pile-${i}`}
          className="w-full max-w-[96px]"
          onClick={() => handleFoundationClick(i)}
        >
          <Card 
            card={last(pile)}
            data-testid={last(pile) ? `card-${last(pile)?.suit}-${last(pile)?.rank}` : `card-foundation-empty-${i}`}
            isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
            onMouseDown={(e) => pile.length > 0 && handleMouseDown(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
            onTouchStart={(e) => pile.length > 0 && handleTouchStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
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
            onClick={() => handleTableauClick(pileIndex, 0)}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              {pile.length === 0 ? (
                <Card data-testid={`card-tableau-empty-${pileIndex}`} isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
              ) : (
                pile.map((card, cardIndex) => {
                  const isTopCard = cardIndex === pile.length - 1;
                  const isSelected = selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex;
                  const draggable = card.faceUp && isSolitaireRun(pile.slice(cardIndex));
                  const yOffset = pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? (window.innerWidth < 640 ? 22 : 24) : 10), 0);
                  
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
                        isSelected={isSelected}
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
    </>
  );
}
