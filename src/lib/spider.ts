
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck } from './solitaire';
import { GameMove, LocatedCard } from './game-logic';

export type { Card, Suit, Rank };

export type SpiderSuitCount = 1 | 2 | 4;

export interface GameState {
  gameType: 'Spider';
  tableau: Card[][];
  foundation: Card[][]; // Stores completed sets of cards (K-A)
  stock: Card[];
  completedSets: number;
  suitCount: SpiderSuitCount;
  moves: number;
  score: number;
}

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates a deck for Spider Solitaire based on the number of suits.
 */
function createSpiderDeck(suitCount: SpiderSuitCount): Card[] {
    const selectedSuits = 
        suitCount === 1 ? ['SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES', 'SPADES'] as Suit[] :
        suitCount === 2 ? ['SPADES', 'SPADES', 'SPADES', 'SPADES', 'HEARTS', 'HEARTS', 'HEARTS', 'HEARTS'] as Suit[] :
        [...SUITS, ...SUITS];

    let deck: Card[] = [];
    selectedSuits.forEach(suit => {
        deck.push(...RANKS.map(rank => ({ suit, rank, faceUp: false })));
    });

    return deck;
}

/**
 * Creates the initial game state for a new game of Spider Solitaire.
 */
export function createInitialState(suitCount: SpiderSuitCount): GameState {
  const deck = shuffleDeck(createSpiderDeck(suitCount));
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  
  // Deal 54 cards to the 10 tableau piles.
  for (let i = 0; i < 54; i++) {
    tableau[i % 10].push(deck.pop()!);
  }

  // Flip the top card of each tableau pile face-up.
  tableau.forEach(pile => {
    if (pile.length > 0) {
      pile[pile.length - 1].faceUp = true;
    }
  });

  return {
    gameType: 'Spider',
    tableau,
    foundation: [],
    stock: deck, // Remaining 50 cards are in the stock.
    completedSets: 0,
    suitCount,
    moves: 0,
    score: 500, // Starting score, decreases with moves.
  };
}

/**
 * Checks if a stack of cards forms a valid run for moving.
 */
export function isRun(cards: Card[]): boolean {
    if (cards.length < 1) return false;
    if (cards.length === 1) return true;
    const firstSuit = cards[0].suit;
    for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].suit !== firstSuit) return false;
        if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
    }
    return true;
}

/**
 * Checks if a stack of cards can be legally moved to a tableau pile.
 */
export function canMoveToTableau(cardsToMove: Card[], destinationCard: Card | undefined, isDragCheck = false): boolean {
  if (isDragCheck && !isRun(cardsToMove)) {
    return false;
  }
  
  const cardToMove = cardsToMove[0];

  if (!destinationCard) {
    return true;
  }

  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return ranksCorrect;
}

/**
 * Checks a tableau pile for a completed set (King to Ace of the same suit).
 */
export function checkForCompletedSet(state: GameState): GameState {
    if (state.gameType !== 'Spider') return state;

    let newState = { ...state, tableau: state.tableau.map(p => [...p]), foundation: state.foundation.map(p => [...p]) };
    let setsFoundInIteration: boolean;
    do {
        setsFoundInIteration = false;
        let tempState = { ...newState, tableau: newState.tableau.map(p => [...p]), foundation: newState.foundation.map(p => [...p]) };

        for (let i = 0; i < tempState.tableau.length; i++) {
            const pile = tempState.tableau[i];
            if (pile.length >= 13) {
                const topThirteen = pile.slice(pile.length - 13);
                const topCard = topThirteen[0];
                if (topCard.rank === 'K' && isRun(topThirteen)) {
                    setsFoundInIteration = true;
                    tempState.tableau[i] = pile.slice(0, pile.length - 13);
                    tempState.foundation.push(topThirteen);
                    tempState.completedSets++;
                    tempState.score += 100;

                    if (tempState.tableau[i].length > 0) {
                        tempState.tableau[i][tempState.tableau[i].length - 1].faceUp = true;
                    }
                }
            }
        }
        if (setsFoundInIteration) newState = tempState;
    } while (setsFoundInIteration);
    return newState;
}
  
/**
 * Checks if the game has been won.
 */
export function isGameWon(state: GameState): boolean {
  return state.completedSets === 8;
}
    
/**
 * Finds the highest-priority valid auto-move for a given card/stack in Spider.
 * Priority is only to another Tableau pile.
 */
export function findAutoMoveForSpider(gs: GameState, selectedCard: LocatedCard): GameMove | null {
    const cardsToMove = gs.tableau[selectedCard.location.pileIndex].slice(selectedCard.location.cardIndex);
    
    // Try to move the stack to any other tableau pile.
    for (let i = 0; i < gs.tableau.length; i++) {
        if (selectedCard.location.pileIndex === i) continue; // Cannot move to the same pile.
        if (canMoveToTableau(cardsToMove, gs.tableau[i][gs.tableau[i].length - 1])) {
            return { source: selectedCard.location, destination: { type: 'tableau', pileIndex: i } };
        }
    }

    return null;
}
