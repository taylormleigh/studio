
"use client";

import type { MouseEvent, TouchEvent } from 'react';
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
  const getCardYOffset = (pile: CardType[], cardIndex: number) => {
    if (gameState.gameType === 'Spider') {
        return pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? 26 : 10), 0)
    }
    // Solitaire and Freecell have different stacking offsets
    const faceUpOffset = window.innerWidth < 640 ? 22 : 24;
    const faceDownOffset = 10;
    return pile.slice(0, cardIndex).reduce((total, c) => total + (c.faceUp ? faceUpOffset : faceDownOffset), 0);
  }

  const isCardDraggable = (pile: CardType[], cardIndex: number) => {
    const card = pile[cardIndex];
    if (!card?.faceUp) return false;

    const stackToMove = pile.slice(cardIndex);
    switch (gameState.gameType) {
        case 'Solitaire':
            return isSolitaireRun(stackToMove);
        case 'Freecell': {
            if (!isFreecellRun(stackToMove)) return false;
            const isDestinationEmpty = false; // Assume not moving to empty for general check
            const movableCount = getMovableCardCount(gameState, isDestinationEmpty);
            return stackToMove.length <= movableCount;
        }
        case 'Spider':
            return isSpiderRun(stackToMove);
        default:
            return false;
    }
  }

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
                const draggable = isCardDraggable(pile, cardIndex);
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
