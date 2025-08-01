
"use client";

import { DragEvent, useMemo } from 'react';
import type { GameState as FreecellGameState } from '@/lib/freecell';
import { getMovableCardCount, isRun } from '@/lib/freecell';
import { Card } from './card';
import type { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';

interface FreecellBoardProps {
  gameState: FreecellGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'freecell' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleDragStart: (e: DragEvent, info: SelectedCardInfo) => void;
  handleDrop: (e: DragEvent, type: 'tableau' | 'freecell' | 'foundation', pileIndex: number) => void;
}

export default function FreecellBoard({ 
  gameState, selectedCard, highlightedPile, handleCardClick, handleDragStart, handleDrop
}: FreecellBoardProps) {
  const { settings } = useSettings();

  const handleFreecellClick = (pileIndex: number) => {
      handleCardClick('freecell', pileIndex, 0);
  };

  const handleFoundationClick = (pileIndex: number) => {
    handleCardClick('foundation', pileIndex, gameState.foundation[pileIndex].length - 1);
  };

  const handleTableauClick = (pileIndex: number, cardIndex: number) => {
      handleCardClick('tableau', pileIndex, cardIndex);
  };
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const DraggableCard = ({pile, pileIndex, cardIndex}: {pile: any[], pileIndex: number, cardIndex: number}) => {
    const card = pile[cardIndex];
    const isTopCard = cardIndex === pile.length - 1;
    
    // Determine how many cards can be moved from this position.
    const stackToTest = pile.slice(cardIndex);
    const isValidRun = isRun(stackToTest);
    const maxMovable = getMovableCardCount(gameState, false);
    
    // A stack is draggable if it's a valid run and its length is within the movable limit.
    const isDraggable = isValidRun && stackToTest.length <= maxMovable;
    
    return (
        <div 
          key={`${card.suit}-${card.rank}-${cardIndex}`} 
          className="absolute w-full"
          style={{
            transform: `translateY(${cardIndex * (window.innerWidth < 640 ? 22 : 24)}px)`,
            zIndex: cardIndex
          }}
        >
            <Card
              card={card}
              isSelected={selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex}
              isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
              draggable={isDraggable}
              isStacked={!isTopCard}
              onDragStart={(e) => isDraggable && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
              onClick={(e) => {
                  e.stopPropagation();
                  handleTableauClick(pileIndex, cardIndex);
              }}
            />
        </div>
    )
  }

  const FreecellPiles = () => (
    <div className="col-span-4 grid grid-cols-4 gap-x-0">
      {gameState.freecells.map((card, i) => (
        <div 
          key={`freecell-${i}`}
          data-testid={`freecell-pile-${i}`}
          className="w-full max-w-[96px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'freecell', i)}
          onClick={() => handleFreecellClick(i)}
        >
          <Card 
            card={card || undefined} 
            isHighlighted={highlightedPile?.type === 'freecell' && highlightedPile?.pileIndex === i}
            isSelected={selectedCard?.type === 'freecell' && selectedCard?.pileIndex === i}
            draggable={!!card}
            onDragStart={(e) => card && handleDragStart(e, {type: 'freecell', pileIndex: i, cardIndex: 0})}
          />
        </div>
      ))}
    </div>
  );

  const FoundationPiles = () => (
     <div className="col-span-4 grid grid-cols-4 gap-x-0">
      {gameState.foundation.map((pile, i) => (
        <div 
          key={`foundation-${i}`} 
          data-testid={`foundation-pile-${i}`}
          className="w-full max-w-[96px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'foundation', i)}
          onClick={() => handleFoundationClick(i)}
        >
          <Card 
            card={pile[pile.length - 1]} 
            isHighlighted={highlightedPile?.type === 'foundation' && highlightedPile?.pileIndex === i}
            isSelected={selectedCard?.type === 'foundation' && selectedCard?.pileIndex === i}
            draggable={false} // Cannot drag from foundation
          />
        </div>
      ))}
    </div>
  );
  
  return (
    <>
       <div className="grid grid-cols-8 gap-x-0 mb-4" data-testid="top-piles">
          {settings.leftHandMode ? (
            <>
              <FoundationPiles />
              <FreecellPiles />
            </>
          ) : (
            <>
              <FreecellPiles />
              <FoundationPiles />
            </>
          )}
      </div>
      <div className="grid grid-cols-8 gap-x-[2px] min-h-[28rem]" data-testid="tableau-piles">
        {gameState.tableau.map((pile, pileIndex) => (
          <div 
            key={pileIndex} 
            data-testid={`tableau-pile-${pileIndex}`}
            className="relative"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'tableau', pileIndex)}
            onClick={() => pile.length === 0 && handleTableauClick(pileIndex, 0)}
          >
            {pile.length === 0 ? (
                <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
              ) : (
                <div className="relative w-full h-full">
                 {pile.map((_, cardIndex) => (
                    <DraggableCard key={cardIndex} pile={pile} pileIndex={pileIndex} cardIndex={cardIndex} />
                 ))}
                </div>
              )
            }
          </div>
        ))}
      </div>
    </>
  );
}
