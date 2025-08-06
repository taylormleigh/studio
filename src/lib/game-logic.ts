
import { GameState as SolitaireGameState, Card as CardType, isRun as isSolitaireRun, last, canMoveToTableau as canMoveSolitaireToTableau, canMoveToFoundation as canMoveSolitaireToFoundation } from './solitaire';
import { GameState as FreecellGameState, isRun as isFreecellRun, getMovableCardCount, canMoveToTableau as canMoveFreecellToTableau, canMoveToFoundation as canMoveFreecellToFoundation } from './freecell';
import { GameState as SpiderGameState, isRun as isSpiderRun, canMoveToTableau as canMoveSpiderToTableau, checkForCompletedSet as checkForSpiderCompletedSet } from './spider';
import { GameSettings } from '@/hooks/use-settings';
import { SelectedCardInfo, HighlightedPile } from '@/components/game/game-board';
import { isGameWon as isSolitaireWon } from './solitaire';
import { isGameWon as isFreecellWon } from './freecell';
import { isGameWon as isSpiderWon } from './spider';

export type GameState = SolitaireGameState | FreecellGameState | SpiderGameState;

export { last, checkForCompletedSet };

export const calculateScore = (moves: number, time: number) => {
    if (time === 0) return 0;
    const timePenalty = Math.floor(time / 10) * 2;
    const movePenalty = moves * 5;
    const score = 10000 - timePenalty - movePenalty;
    return Math.max(0, score);
};

export function isGameWon(state: GameState): boolean {
    if (state.gameType === 'Solitaire') return isSolitaireWon(state);
    if (state.gameType === 'Freecell') return isFreecellWon(state);
    if (state.gameType === 'Spider') return isSpiderWon(state);
    return false;
}

const moveCards = (
    gameState: GameState,
    sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell',
    sourcePileIndex: number,
    sourceCardIndex: number,
    destType: 'tableau' | 'foundation' | 'freecell',
    destPileIndex: number
): { newState: GameState | null, highlightedPile: HighlightedPile | null } => {
    let newGameState = JSON.parse(JSON.stringify(gameState));
    let moveSuccessful = false;

    if (newGameState.gameType === 'Solitaire') {
        let cardsToMove: CardType[];
        if (sourceType === 'waste') cardsToMove = [newGameState.waste[newGameState.waste.length - 1]];
        else if (sourceType === 'foundation') cardsToMove = [newGameState.foundation[sourcePileIndex][newGameState.foundation[sourcePileIndex].length - 1]];
        else cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
        
        const cardToMove = cardsToMove[0];
        if (destType === 'tableau') {
            if (canMoveSolitaireToTableau(cardToMove, last(newGameState.tableau[destPileIndex]))) {
                newGameState.tableau[destPileIndex].push(...cardsToMove);
                moveSuccessful = true;
            }
        } else if (destType === 'foundation') {
            if (cardsToMove.length === 1 && canMoveSolitaireToFoundation(cardToMove, newGameState.foundation[destPileIndex])) {
                newGameState.foundation[destPileIndex].push(cardToMove);
                moveSuccessful = true;
            }
        }
        if (moveSuccessful) {
            if (sourceType === 'waste') newGameState.waste.pop();
            else if (sourceType === 'foundation') newGameState.foundation[sourcePileIndex].pop();
            else {
                const sourcePile = newGameState.tableau[sourcePileIndex];
                sourcePile.splice(sourceCardIndex);
                if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) last(sourcePile)!.faceUp = true;
            }
        }
    } else if (newGameState.gameType === 'Freecell') {
        let cardsToMove: CardType[];
        if (sourceType === 'tableau') cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
        else cardsToMove = [newGameState.freecells[sourcePileIndex]!];

        const cardToMove = cardsToMove[0];
        const isDestinationEmpty = destType === 'tableau' && newGameState.tableau[destPileIndex].length === 0;
        const movableCount = getMovableCardCount(newGameState, isDestinationEmpty);
        if (cardsToMove.length > movableCount || (sourceType === 'tableau' && !isFreecellRun(cardsToMove))) {
            return { newState: null, highlightedPile: null };
        }

        if (destType === 'tableau') {
            if (canMoveFreecellToTableau(cardToMove, last(newGameState.tableau[destPileIndex]))) {
                newGameState.tableau[destPileIndex].push(...cardsToMove);
                moveSuccessful = true;
            }
        } else if (destType === 'foundation') {
            if (cardsToMove.length === 1 && canMoveFreecellToFoundation(cardToMove, newGameState.foundation[destPileIndex])) {
                newGameState.foundation[destPileIndex].push(cardToMove);
                moveSuccessful = true;
            }
        } else if (destType === 'freecell') {
            if (cardsToMove.length === 1 && newGameState.freecells[destPileIndex] === null) {
                newGameState.freecells[destPileIndex] = cardToMove;
                moveSuccessful = true;
            }
        }
        if (moveSuccessful) {
            if (sourceType === 'tableau') newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
            else newGameState.freecells[sourcePileIndex] = null;
        }
    } else if (newGameState.gameType === 'Spider') {
        const sourcePile = newGameState.tableau[sourcePileIndex];
        const cardsToMove = sourcePile.slice(sourceCardIndex);
        const destPile = newGameState.tableau[destPileIndex];
        if (canMoveSpiderToTableau(cardsToMove, last(destPile))) {
            sourcePile.splice(sourceCardIndex);
            destPile.push(...cardsToMove);
            if (sourcePile.length > 0 && !last(sourcePile)!.faceUp) last(sourcePile)!.faceUp = true;
            newGameState.score--;
            moveSuccessful = true;
        }
    }

    if (moveSuccessful) {
        newGameState.moves++;
        return { newState: newGameState, highlightedPile: { type: destType, pileIndex: destPileIndex }};
    }

    return { newState: null, highlightedPile: null };
};

export const processCardClick = (
    gameState: GameState,
    selectedCard: SelectedCardInfo | null,
    settings: GameSettings,
    clickInfo: { sourceType: 'tableau' | 'waste' | 'foundation' | 'freecell', pileIndex: number, cardIndex: number },
    toast: (options: { variant: "destructive", title: string, description: string }) => void
): { newState: GameState | null, newSelectedCard: SelectedCardInfo | null, highlightedPile: HighlightedPile, saveHistory: boolean } => {
    
    const { sourceType, pileIndex, cardIndex } = clickInfo;

    // A card is already selected, try to move it
    if (selectedCard) {
        if (selectedCard.type === sourceType && selectedCard.pileIndex === pileIndex && selectedCard.cardIndex === cardIndex) {
            return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
        }
        
        let moveResult = moveCards(gameState, selectedCard.type, selectedCard.pileIndex, selectedCard.cardIndex, sourceType as any, pileIndex);
        if (gameState.gameType === 'Freecell' && !moveResult.newState) {
            const cardsToMove = selectedCard.type === 'tableau' ? gameState.tableau[selectedCard.pileIndex].slice(selectedCard.cardIndex) : [ (gameState as FreecellGameState).freecells[selectedCard.pileIndex]! ];
            const isDestinationEmpty = sourceType === 'tableau' && gameState.tableau[pileIndex].length === 0;
            const movableCount = getMovableCardCount(gameState as FreecellGameState, isDestinationEmpty);
            if(cardsToMove.length > movableCount) {
              toast({ variant: "destructive", title: "Invalid Move", description: `Cannot move ${cardsToMove.length} cards. Only ${movableCount} are movable.` });
            }
        }
        return { ...moveResult, newSelectedCard: null, saveHistory: !!moveResult.newState };
    }
    
    // No card is selected, handle the first click
    const sourcePile = sourceType === 'tableau' ? gameState.tableau[pileIndex] : [];
    const clickedCard = 
        (sourceType === 'waste' && gameState.gameType === 'Solitaire') ? last((gameState as SolitaireGameState).waste) :
        (sourceType === 'tableau') ? sourcePile?.[cardIndex] :
        (sourceType === 'foundation' && (gameState.gameType === 'Solitaire' || gameState.gameType === 'Freecell')) ? last(gameState.foundation[pileIndex]) :
        (sourceType === 'freecell' && gameState.gameType === 'Freecell') ? (gameState as FreecellGameState).freecells[pileIndex] :
        undefined;

    if (sourceType === 'tableau' && clickedCard && !clickedCard.faceUp && cardIndex === sourcePile.length - 1) {
        let newState = JSON.parse(JSON.stringify(gameState));
        newState.tableau[pileIndex][cardIndex].faceUp = true;
        newState.moves++;
        return { newState, newSelectedCard: null, highlightedPile: null, saveHistory: true };
    }
    
    if (!clickedCard || !clickedCard.faceUp) {
        return { newState: null, newSelectedCard: null, highlightedPile: null, saveHistory: false };
    }

    if (settings.autoMove) {
        if (gameState.gameType === 'Solitaire') {
            const canMoveToTableauFn = canMoveSolitaireToTableau;
            const canMoveToFoundationFn = canMoveSolitaireToFoundation;
            
            for (let i = 0; i < gameState.foundation.length; i++) {
                if (canMoveToFoundationFn(clickedCard, gameState.foundation[i])) {
                    return { ...moveCards(gameState, sourceType, pileIndex, cardIndex, 'foundation', i), newSelectedCard: null, saveHistory: true };
                }
            }
            if (sourceType === 'tableau' || sourceType === 'waste') {
                for (let i = 0; i < gameState.tableau.length; i++) {
                    const sourceCards = sourceType === 'tableau' ? gameState.tableau[pileIndex].slice(cardIndex) : [clickedCard];
                    if (isSolitaireRun(sourceCards) && canMoveToTableauFn(sourceCards[0], last(gameState.tableau[i]))) {
                        return { ...moveCards(gameState, sourceType, pileIndex, cardIndex, 'tableau', i), newSelectedCard: null, saveHistory: true };
                    }
                }
            }
        } else if (gameState.gameType === 'Freecell') {
            for (let i = 0; i < gameState.foundation.length; i++) {
                if (canMoveFreecellToFoundation(clickedCard, gameState.foundation[i])) {
                    return { ...moveCards(gameState, sourceType, pileIndex, cardIndex, 'foundation', i), newSelectedCard: null, saveHistory: true };
                }
            }
            for (let i = 0; i < gameState.tableau.length; i++) {
                const sourceCards = sourceType === 'tableau' ? gameState.tableau[pileIndex].slice(cardIndex) : [clickedCard];
                if (isFreecellRun(sourceCards) && canMoveFreecellToTableau(sourceCards[0], last(gameState.tableau[i]))) {
                    return { ...moveCards(gameState, sourceType, pileIndex, cardIndex, 'tableau', i), newSelectedCard: null, saveHistory: true };
                }
            }
            if (sourceType === 'tableau' && (gameState as FreecellGameState).freecells.some(c => c === null)) {
                const emptyCellIndex = (gameState as FreecellGameState).freecells.findIndex(c => c === null);
                return { ...moveCards(gameState, sourceType, pileIndex, cardIndex, 'freecell', emptyCellIndex), newSelectedCard: null, saveHistory: true };
            }
        } else if (gameState.gameType === 'Spider') {
            const sourcePile = gameState.tableau[pileIndex];
            const cardsToMove = sourcePile.slice(cardIndex);
            if (isSpiderRun(cardsToMove)) {
                for (let i = 0; i < gameState.tableau.length; i++) {
                    if (i === pileIndex) continue;
                    if (canMoveSpiderToTableau(cardsToMove, last(gameState.tableau[i]))) {
                        return { ...moveCards(gameState, 'tableau', pileIndex, cardIndex, 'tableau', i), newSelectedCard: null, saveHistory: true };
                    }
                }
            }
        }
    }

    // No auto-move found, so select the card
    return { newState: null, newSelectedCard: { type: sourceType, pileIndex, cardIndex }, highlightedPile: null, saveHistory: false };
};
