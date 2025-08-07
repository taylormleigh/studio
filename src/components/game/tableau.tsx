
"use client";

import { useMemo, type MouseEvent, type TouchEvent } from 'react';
import type { Card as CardType } from '@/lib/solitaire';
import { isRun as isFreecellRun, getMovableCardCount } from '@/lib/freecell';
import { isRun as isSolitaireRun } from '@/lib/solitaire';
import { isRun as isSpiderRun } from '@/lib/spider';
import { GameState, LocatedCard, CardLocation } from '@/lib/game-logic';
import { Card } from './card';
import type { HighlightedPile } from './game-board';

interface TableauProps {
  gameState: GameState;
  gridCols: string;
  selectedCard: LocatedCard | null;
  highlightedPile: HighlightedPile | null;
  handleCardClick: (card: CardType | undefined, location: CardLocation) => void;
  handleMouseDown: (e: MouseEvent, card: CardType, location: CardLocation) => void;
  handleTouchStart: (e: TouchEvent, card: CardType, location: CardLocation) => void;
  handleDrop: (location: CardLocation) => void;
}

export default function Tableau({ gameState, gridCols, highlightedPile, handleCardClick, handleMouseDown, handleTouchStart, handleDrop }: TableauProps) {
  console.log("tableau.tsx: Tableau component rendered");
  const getCardYOffset = (pile: CardType[], cardIndex: number) => {
    if (gameState.gameType === 'Spider') {
        return pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? 26 : 10), 0)
    }
    // Solitaire and Freecell have different stacking offsets
    const faceUpOffset = window.innerWidth < 640 ? 22 : 24;
    const faceDownOffset = 10;
    return pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? faceUpOffset : faceDownOffset), 0);
  }

  const isCardDraggable = useMemo(() => {
    console.log("tableau.tsx: Recalculating isCardDraggable map");
    const draggableMap = new Map<string, boolean>();

    gameState.tableau.forEach((pile, pileIndex) => {
        pile.forEach((card, cardIndex) => {
            const key = `${pileIndex}-${cardIndex}`;
            if (!card?.faceUp) {
                draggableMap.set(key, false);
                return;
            }

            const stackToMove = pile.slice(cardIndex);
            let isDraggable = false;
            switch (gameState.gameType) {
                case 'Solitaire':
                    isDraggable = isSolitaireRun(stackToMove);
                    break;
                case 'Freecell': {
                    if (!isFreecellRun(stackToMove)) {
                       isDraggable = false;
                       break;
                    }
                    const isDestinationEmpty = false; // Assume not moving to empty for general check
                    const movableCount = getMovableCardCount(gameState, isDestinationEmpty);
                    isDraggable = stackToMove.length <= movableCount;
                    break;
                }
                case 'Spider':
                    isDraggable = isSpiderRun(stackToMove);
                    break;
                default:
                    isDraggable = false;
            }
             draggableMap.set(key, isDraggable);
        });
    });

    return draggableMap;
  }, [gameState]); // Only re-run when gameState changes

  return (
    <div className={`grid ${gridCols} gap-x-0 min-h-[28rem]`} data-testid="tableau-piles">
      {gameState.tableau.map((pile, pileIndex) => (
        <div 
          key={pileIndex} 
          data-testid={`tableau-pile-${pileIndex}`}
          className="relative"
        >
          <div className="absolute top-0 left-0 w-full h-full">
            {pile.length === 0 ? (
              <Card 
                data-testid={`card-tableau-empty-${pileIndex}`} 
                isHighlighted={highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                onMouseUp={() => handleDrop({ type: 'tableau', pileIndex, cardIndex: -1 })}
                onTouchEnd={() => handleDrop({ type: 'tableau', pileIndex, cardIndex: -1 })}
                onClick={() => handleCardClick(undefined, { type: 'tableau', pileIndex, cardIndex: -1 })}
              />
            ) : (
              pile.map((card, cardIndex) => {
                const isTopCard = cardIndex === pile.length - 1;
                const draggable = isCardDraggable.get(`${pileIndex}-${cardIndex}`) || false;
                const yOffset = getCardYOffset(pile, cardIndex);
                const location: CardLocation = { type: 'tableau', pileIndex, cardIndex };
                
                return (
                  <div 
                    key={`${card.suit}-${card.rank}-${cardIndex}`} 
                    className="absolute w-full"
                    style={{ transform: `translateY(${yOffset}px)`, zIndex: cardIndex }}
                  >
                      <Card
                        card={card}
                        data-testid={`card-${card.suit}-${card.rank}`}
                        isHighlighted={isTopCard && highlightedPile?.type === 'tableau' && highlightedPile?.pileIndex === pileIndex}
                        isStacked={card.faceUp && !isTopCard}
                        className={isTopCard ? '' : (card.faceUp ? 'pb-5 sm:pb-6' : 'pb-3')}
                        onMouseDown={(e) => draggable && handleMouseDown(e, card, location)}
                        onTouchStart={(e) => draggable && handleTouchStart(e, card, location)}
                        onMouseUp={() => handleDrop(location)}
                        onTouchEnd={() => handleDrop(location)}
                        onClick={(e) => {
                            console.log("tableau.tsx: Card clicked");
                            if (card.faceUp) {
                              console.log("tableau.tsx: conditional - card is face up");
                            }
                            e.stopPropagation();
                            handleCardClick(card, location);
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
  );
}
