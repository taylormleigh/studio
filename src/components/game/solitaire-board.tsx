
"use client";

import { useState, useEffect, useRef, type MouseEvent, type TouchEvent, memo } from 'react';
import type { GameState as SolitaireGameState } from '@/lib/solitaire';
import { last, Card as CardType } from '@/lib/solitaire';
import { Card } from './card';
import type { HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';
import { LocatedCard, CardLocation } from '@/lib/game-logic';
import { log } from '@/lib/utils';

interface SolitaireBoardProps {
  gameState: SolitaireGameState;
  selectedCard: LocatedCard | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (card: CardType | undefined, location: CardLocation) => void;
  handleMouseDown: (e: MouseEvent, card: CardType, location: CardLocation) => void;
  handleTouchStart: (e: TouchEvent, card: CardType, location: CardLocation) => void;
  handleDrop: (location: CardLocation) => void;
  handleDraw: () => void;
}

export default function SolitaireBoard(props: SolitaireBoardProps) {
  const { settings } = useSettings();

  return (
    <>
      <div className="grid grid-cols-7 gap-x-[clamp(2px,1vw,4px)] mb-4" data-testid="top-piles">
        {settings.leftHandMode ? (
          <>
            <StockAndWaste {...props} />
            <div className="col-span-1" />
            <FoundationPiles {...props} />
          </>
        ) : (
          <>
            <FoundationPiles {...props} />
            <div className="col-span-1" />
            <StockAndWaste {...props} />
          </>
        )}
      </div>
      <Tableau {...props} gridCols="grid-cols-7" />
    </>
  );
}

const StockAndWaste = memo(({ gameState, handleDraw, handleMouseDown, handleTouchStart, handleCardClick }: SolitaireBoardProps) => {
  const { settings } = useSettings();
  const [wasteTurn, setWasteTurn] = useState(0);
  const prevStockLengthRef = useRef(gameState.stock.length);

  useEffect(() => {
    const prevStockLength = prevStockLengthRef.current;
    
    // Reset wasteTurn when stock is recycled
    if (prevStockLength === 0 && gameState.stock.length > 0) {
        log('solitaire-board.tsx: New game or stock recycle detected, resetting wasteTurn');
        setWasteTurn(0);
    }
    
    // This is crucial to keep the ref updated for the next render cycle.
    prevStockLengthRef.current = gameState.stock.length;

  }, [gameState.stock.length]);


  const handleStockClick = () => {
    // If stock is not empty, it's a draw, so increment turn.
    if(gameState.stock.length > 0) {
      setWasteTurn(prev => prev + 1);
    }
    // Then, perform the actual draw logic from the parent.
    handleDraw();
  }


  const Stock = () => (
    <div className="col-span-1 w-full max-w-[96px]" data-testid="stock-pile">
        <Card 
          onClick={handleStockClick} 
          card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} 
          data-testid="card-stock" />
    </div>
  );

  const Waste = () => {
    const { waste, drawCount } = gameState;
    
    if (waste.length === 0) {
      return (
        <div className="col-span-1 w-full max-w-[96px]">
          <Card onClick={handleStockClick} data-testid="card-waste-empty" />
        </div>
      );
    }
    
    if (drawCount === 1) {
      const topCard = last(waste)!;
      const location: CardLocation = { type: 'waste', pileIndex: 0, cardIndex: waste.length - 1 };
      return (
        <div className="col-span-1 w-full max-w-[96px]">
          <Card
            card={topCard}
            onMouseDown={(e) => handleMouseDown(e, topCard, location)}
            onTouchStart={(e) => handleTouchStart(e, topCard, location)}
            onClick={() => handleCardClick(topCard, location)}
          />
        </div>
      );
    }
    
    const startIndex = Math.max(0, waste.length - 3);
    const cardsToShow = waste.slice(startIndex);
  
    return (
      <div data-testid="waste-pile" className="col-span-1 w-full max-w-[96px] h-full relative">
        {cardsToShow.map((card, index) => {
          const cardIndexInWaste = waste.indexOf(card);
          const isTopCard = cardIndexInWaste === waste.length - 1;
          const location: CardLocation = { type: 'waste', pileIndex: 0, cardIndex: cardIndexInWaste };
          const xOffset = index * 25;
          
          return (
            <div 
              key={`${card.suit}-${card.rank}-${cardIndexInWaste}`} 
              className="absolute w-full"
              style={{ transform: `translateX(${xOffset}px)`, zIndex: index }}
            >
              <Card
                card={card}
                className={`solitaire-waste-card ${isTopCard ? '' : 'covered-card'} w-full max-w-[96px]`}
                style={{ pointerEvents: isTopCard ? 'auto' : 'none' }}
                onMouseDown={(e) => isTopCard && handleMouseDown(e, card, location)}
                onTouchStart={(e) => isTopCard && handleTouchStart(e, card, location)}
                onClick={() => isTopCard && handleCardClick(card, location)}
              />
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="col-span-2 grid grid-cols-2 gap-x-[clamp(2px,1vw,4px)]">
      {settings.leftHandMode ? <><Stock /><Waste /></> : <><Waste /><Stock /></>}
    </div>
  );
});
StockAndWaste.displayName = 'StockAndWaste';

const FoundationPiles = ({ gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDrop }: SolitaireBoardProps) => (
    <div className={`${gameState.gameType.toLowerCase()}-foundation col-span-4 grid grid-cols-4 gap-x-[clamp(2px,1vw,4px)]`} data-testid="foundation-piles">
      {gameState.foundation.map((pile, i) => {
        const topCard = last(pile);
        const location: CardLocation = {type: 'foundation', pileIndex: i, cardIndex: pile.length-1};
        return (
          <div 
            key={i} 
            data-testid={`foundation-pile-${i}`}
            className="w-full max-w-[96px]"
          >
            <Card 
              card={topCard}
              data-testid={topCard ? `card-${topCard.suit}-${topCard.rank}` : `card-foundation-empty-${i}`}
              isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
              onMouseDown={(e) => {
                  e.stopPropagation(); 
                  if(topCard) handleMouseDown(e, topCard, location)
              }}
              onTouchStart={(e) => {
                  e.stopPropagation();
                  if(topCard) handleTouchStart(e, topCard, location)
              }}
              onMouseUp={() => handleDrop(location)}
              onTouchEnd={() => handleDrop(location)}
              onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(topCard, location)
              }}
            />
          </div>
        )
      })}
    </div>
);
