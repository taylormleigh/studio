
"use client";

import { DragEvent } from 'react';
import { GameState as FreecellGameState, getMovableCardCount } from '@/lib/freecell';
import { Card } from './card';
import { SelectedCardInfo, HighlightedPile } from './game-board';
import { useSettings } from '@/hooks/use-settings';

interface FreecellBoardProps {
  gameState: FreecellGameState;
  selectedCard: SelectedCardInfo | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (type: 'tableau' | 'freecell' | 'foundation', pileIndex: number, cardIndex: number) => void;
  handleDragStart: (e: DragEvent, info: SelectedCardInfo) => void;
  handleDrop: (e: DragEvent, type: 'tableau' | 'freecell' | 'foundation', pileIndex: number) => void;
  moveCards: (sourceType: 'tableau' | 'freecell' | 'foundation', sourcePileIndex: number, sourceCardIndex: number, destType: 'tableau' | 'freecell' | 'foundation', destPileIndex: number) => void;
}

export default function FreecellBoard({ 
  gameState, selectedCard, highlightedPile, handleCardClick, handleDragStart, handleDrop, moveCards 
}: FreecellBoardProps) {
  const { settings } = useSettings();

  const handleFreecellClick = (pileIndex: number) => {
    if (selectedCard) {
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'freecell', pileIndex);
    } else if (gameState.freecells[pileIndex]) {
      handleCardClick('freecell', pileIndex, 0);
    }
  };

  const handleFoundationClick = (pileIndex: number) => {
    if (selectedCard) {
      moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'foundation', pileIndex);
    } else if (gameState.foundation[pileIndex].length > 0) {
      handleCardClick('foundation', pileIndex, gameState.foundation[pileIndex].length - 1);
    }
  };

  const handleTableauClick = (pileIndex: number) => {
    if (selectedCard) {
      if (selectedCard.type === 'tableau' && selectedCard.pileIndex === pileIndex) {
        // Deselect if clicking the same pile
      } else {
        moveCards(selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, 'tableau', pileIndex);
      }
    }
  };
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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
            draggable={pile.length > 0}
            onDragStart={(e) => pile.length > 0 && handleDragStart(e, {type: 'foundation', pileIndex: i, cardIndex: pile.length-1})}
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
              <FreecellPiles />
              <FoundationPiles />
            </>
          ) : (
            <>
              <FoundationPiles />
              <FreecellPiles />
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
            onClick={() => pile.length === 0 && handleTableauClick(pileIndex)}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              {pile.length === 0 ? (
                <Card isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}/>
              ) : (
                pile.map((card, cardIndex) => {
                  const isTopCard = cardIndex === pile.length - 1;
                  const movableCards = getMovableCardCount(gameState);
                  const canDrag = pile.length - cardIndex <= movableCards;

                  return(
                    <div 
                      key={`${card.suit}-${card.rank}-${cardIndex}`} 
                      className="absolute w-full"
                    >
                       <div className="relative w-full h-5 sm:h-6"
                          style={{
                            transform: `translateY(${cardIndex * (window.innerWidth < 640 ? 22 : 24)}px)`
                          }}
                       >
                        <Card
                          card={card}
                          isSelected={selectedCard?.type === 'tableau' && selectedCard?.pileIndex === pileIndex && selectedCard?.cardIndex <= cardIndex}
                          isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                          draggable={canDrag}
                          isStacked={!isTopCard}
                          onDragStart={(e) => canDrag && handleDragStart(e, { type: 'tableau', pileIndex, cardIndex })}
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
