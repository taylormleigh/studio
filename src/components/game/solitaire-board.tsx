
"use client";

import type { MouseEvent, TouchEvent } from 'react';
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

const StockAndWaste = ({ gameState, handleDraw, handleMouseDown, handleTouchStart, handleCardClick, handleDrop }: SolitaireBoardProps) => {
  const { settings } = useSettings();
  
  const Stock = () => (
    <div className="cursor-pointer" data-testid="stock-pile">
        <Card onClick={() => handleDraw()} card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
    </div>
  );

  const Waste = () => {
    const wasteCard = last(gameState.waste);
    const location: CardLocation = {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1};
    return (
        <div data-testid="waste-pile">
            {wasteCard ? (
                <Card 
                    card={wasteCard} 
                    data-testid={`card-${wasteCard.suit}-${wasteCard.rank}`}
                    onMouseDown={(e) => handleMouseDown(e, wasteCard, location)}
                    onTouchStart={(e) => handleTouchStart(e, wasteCard, location)}
                    onClick={() => handleCardClick(wasteCard, location)}
                />
            ) : (
                <Card onClick={() => handleDraw()} data-testid="card-waste-empty" />
            )}
        </div>
    );
  }
  
  return settings.leftHandMode ? <><Stock /><Waste /></> : <><Waste /><Stock /></>
}


const FoundationPiles = ({ gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDrop }: SolitaireBoardProps) => (
    <div className={`${gameState.gameType.toLowerCase()}-foundation flex col-span-4 justify-end gap-x-[clamp(2px,1vw,4px)]" data-testid="foundation-piles`}>
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
