
"use client";

import type { MouseEvent, TouchEvent } from 'react';
import type { GameState as FreecellGameState } from '@/lib/freecell';
import { Card } from './card';
import type { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';
import Tableau from './tableau';

interface FreecellBoardProps {
  gameState: FreecellGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'freecell' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleMouseDown: (e: MouseEvent, info: SelectedCardInfo) => void;
  handleTouchStart: (e: TouchEvent, info: SelectedCardInfo) => void;
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

const FreecellPiles = ({ gameState, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart }: FreecellBoardProps) => (
  <div className="col-span-4 grid grid-cols-4 gap-x-0" data-testid="freecell-piles">
    {gameState.freecells.map((card, i) => (
      <div 
        key={`freecell-${i}`}
        data-testid={`freecell-pile-${i}`}
        className="w-full max-w-[96px]"
      >
        <Card 
          card={card || undefined} 
          data-testid={card ? `card-${card.suit}-${card.rank}` : `card-freecell-empty-${i}`}
          isHighlighted={highlightedPile?.type === 'freecell' && highlightedPile?.pileIndex === i}
          onMouseDown={(e) => card && handleMouseDown(e, {type: 'freecell', pileIndex: i, cardIndex: 0})}
          onTouchStart={(e) => card && handleTouchStart(e, {type: 'freecell', pileIndex: i, cardIndex: 0})}
          onClick={() => handleCardClick('freecell', i, 0)}
        />
      </div>
    ))}
  </div>
);

const FoundationPiles = ({ gameState, highlightedPile, handleCardClick }: FreecellBoardProps) => (
   <div className="col-span-4 grid grid-cols-4 gap-x-0" data-testid="foundation-piles">
    {gameState.foundation.map((pile, i) => (
      <div 
        key={`foundation-${i}`} 
        data-testid={`foundation-pile-${i}`}
        className="w-full max-w-[96px]"
      >
        <Card 
          card={pile[pile.length - 1]} 
          data-testid={pile.length > 0 ? `card-${pile[pile.length - 1].suit}-${pile[pile.length - 1].rank}` : `card-foundation-empty-${i}`}
          isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
          onClick={() => handleCardClick('foundation', i, pile.length - 1)}
        />
      </div>
    ))}
  </div>
);
