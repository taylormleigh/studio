
"use client";

import type { MouseEvent, TouchEvent } from 'react';
import type { GameState as FreecellGameState } from '@/lib/freecell';
import { Card } from './card';
import type { HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';
import { last, Card as CardType } from '@/lib/solitaire';
import { LocatedCard, CardLocation } from '@/lib/game-logic';

interface FreecellBoardProps {
  gameState: FreecellGameState;
  selectedCard: LocatedCard | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (card: CardType | undefined, location: CardLocation) => void;
  handleMouseDown: (e: MouseEvent, card: CardType, location: CardLocation) => void;
  handleTouchStart: (e: TouchEvent, card: CardType, location: CardLocation) => void;
  handleDrop: (location: CardLocation) => void;
}

export default function FreecellBoard(props: FreecellBoardProps) {
  const { settings } = useSettings();
  
  return (
    <>
      <div className="grid grid-cols-8 gap-x-0 mb-4" data-testid="top-piles">
        {settings.leftHandMode ? <><FoundationPiles {...props} /><FreecellPiles {...props} /></> : <><FreecellPiles {...props} /><FoundationPiles {...props} /></>}
      </div>
      <Tableau {...props} gridCols="grid-cols-8" />
    </>
  );
}

const FreecellPiles = ({ gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDrop }: FreecellBoardProps) => (
  <div className="col-span-4 grid grid-cols-4 gap-x-0" data-testid="freecell-piles">
    {gameState.freecells.map((card, i) => {
      const location: CardLocation = {type: 'freecell', pileIndex: i, cardIndex: 0};
      return (
        <div 
          key={`freecell-${i}`}
          data-testid={`freecell-pile-${i}`}
          className="w-full max-w-[96px]"
        >
          <Card 
            card={card || undefined} 
            data-testid={card ? `card-${card.suit}-${card.rank}` : `card-freecell-empty-${i}`}
            isHighlighted={highlightedPile?.type === 'freecell' && highlightedPile?.pileIndex === i}
            onMouseDown={(e) => card && handleMouseDown(e, card, location)}
            onTouchStart={(e) => card && handleTouchStart(e, card, location)}
            onMouseUp={() => handleDrop(location)}
            onTouchEnd={() => handleDrop(location)}
            onClick={() => handleCardClick(card, location)}
          />
        </div>
      )
    })}
  </div>
);

const FoundationPiles = ({ gameState, highlightedPile, handleCardClick, handleDrop }: FreecellBoardProps) => (
   <div className={`${gameState.gameType.toLowerCase()}-foundation col-span-4 grid grid-cols-4 gap-x-0`}data-testid="foundation-piles">
    {gameState.foundation.map((pile, i) => {
        const location: CardLocation = { type: 'foundation', pileIndex: i, cardIndex: pile.length - 1};
        return (
          <div 
            key={`foundation-${i}`} 
            data-testid={`foundation-pile-${i}`}
            className="w-full max-w-[96px]"
            onClick={() => handleCardClick(last(pile), location)}
            onMouseUp={() => handleDrop(location)}
            onTouchEnd={() => handleDrop(location)}
          >
            <Card 
              card={last(pile)} 
              data-testid={last(pile) ? `card-${last(pile)?.suit}-${last(pile)?.rank}` : `card-foundation-empty-${i}`}
              isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
            />
          </div>
        )
    })}
  </div>
);
