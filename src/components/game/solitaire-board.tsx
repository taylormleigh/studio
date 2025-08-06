
"use client";

import type { MouseEvent, TouchEvent } from 'react';
import type { GameState as SolitaireGameState } from '@/lib/solitaire';
import { last } from '@/lib/solitaire';
import { Card } from './card';
import type { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';

interface SolitaireBoardProps {
  gameState: SolitaireGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'waste' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleMouseDown: (e: MouseEvent, info: SelectedCardInfo) => void;
  handleTouchStart: (e: TouchEvent, info: SelectedCardInfo) => void;
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

const StockAndWaste = ({ gameState, handleDraw, handleMouseDown, handleTouchStart, handleCardClick }: SolitaireBoardProps) => {
  const { settings } = useSettings();
  
  const Stock = () => (
    <div className="cursor-pointer" data-testid="stock-pile">
        <Card onClick={handleDraw} card={gameState.stock.length > 0 ? { ...gameState.stock[0], faceUp: false } : undefined} data-testid="card-stock" />
    </div>
  );

  const Waste = () => (
    <div data-testid="waste-pile">
        {gameState.waste.length > 0 ? (
            <Card 
                card={last(gameState.waste)} 
                data-testid={`card-${last(gameState.waste)?.suit}-${last(gameState.waste)?.rank}`}
                onMouseDown={(e) => handleMouseDown(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onTouchStart={(e) => handleTouchStart(e, {type: 'waste', pileIndex: 0, cardIndex: gameState.waste.length-1})}
                onClick={() => handleCardClick('waste', 0, gameState.waste.length - 1)}
            />
        ) : (
            <Card onClick={handleDraw} data-testid="card-waste-empty" />
        )}
    </div>
  );
  
  return settings.leftHandMode ? <><Stock /><Waste /></> : <><Waste /><Stock /></>
}


const FoundationPiles = ({ gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart }: SolitaireBoardProps) => (
    <div className="flex col-span-4 justify-end gap-x-[clamp(2px,1vw,4px)]" data-testid="foundation-piles">
      {gameState.foundation.map((pile, i) => (
        <div 
          key={i} 
          data-testid={`foundation-pile-${i}`}
          className="w-full max-w-[96px]"
          onClick={() => handleCardClick('foundation', i, pile.length - 1)}
        >
          <Card 
            card={last(pile)}
            data-testid={last(pile) ? `card-${last(pile)?.suit}-${last(pile)?.rank}` : `card-foundation-empty-${i}`}
            isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
            onMouseDown={(e) => {
                e.stopPropagation(); // prevent parent onClick from firing
                if(pile.length > 0) handleMouseDown(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})
            }}
            onTouchStart={(e) => {
                e.stopPropagation();
                if(pile.length > 0) handleTouchStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})
            }}
            onClick={(e) => {
                e.stopPropagation();
                handleCardClick('foundation', i, pile.length - 1)
            }}
          />
        </div>
      ))}
    </div>
);