
"use client";

import { memo, type MouseEvent, type TouchEvent } from 'react';
import type { GameState as SolitaireGameState } from '@/lib/solitaire';
import { last, Card as CardType } from '@/lib/solitaire';
import { Card } from './card';
import type { HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';
import { LocatedCard, CardLocation } from '@/lib/game-logic';

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

  const Stock = () => (
    <div className="col-span-1 w-full max-w-[96px]" data-testid="stock-pile">
        <Card 
          onClick={handleDraw} 
          card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} 
          data-testid="card-stock" />
    </div>
  );

  const Waste = () => {
    const { drawnCards } = gameState;
    
    if (drawnCards.length === 0) {
      return (
        <div className="col-span-1 w-full max-w-[96px]">
          <Card onClick={handleDraw} data-testid="card-waste-empty" />
        </div>
      );
    }
    
    // Draw 3 logic
    if (gameState.drawCount === 3) {
      return (
        <div data-testid="waste-pile" className="solitaire-waste-pile col-span-1 w-full max-w-[96px] h-full relative">
          {drawnCards.map((card, index) => {
            const isTopCard = index === drawnCards.length - 1;
            const location: CardLocation = { type: 'waste', pileIndex: 0, cardIndex: index };
            const xOffset = index * 25;
            
            return (
              <div 
                key={`${card.suit}-${card.rank}-${index}`} 
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
    }
    
    // Single card draw logic
    const topCard = drawnCards[0];
    const location: CardLocation = { type: 'waste', pileIndex: 0, cardIndex: 0 };
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
  };
  
  return (
    <div className="col-span-2 grid grid-cols-2 gap-x-[clamp(2px,1vw,4px)]">
        <Stock />
        <Waste />
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
