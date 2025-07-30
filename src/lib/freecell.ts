
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck, getCardColor } from './solitaire';

export type { Card, Suit, Rank };

export interface GameState {
  gameType: 'Freecell';
  tableau: Card[][];
  foundation: Card[][];
  freecells: (Card | null)[];
  moves: number;
  score: number;
}

const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

export function createInitialState(): GameState {
  const deck = shuffleDeck(createDeck()).map(c => ({ ...c, faceUp: true }));
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);
  
  deck.forEach((card, index) => {
    tableau[index % 8].push(card);
  });

  return {
    gameType: 'Freecell',
    tableau,
    foundation: [[], [], [], []],
    freecells: [null, null, null, null],
    moves: 0,
    score: 0,
  };
}


export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  if (!destinationCard) {
    return true; // Any card can move to an empty tableau pile
  }
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return !colorsMatch && ranksCorrect;
}

export function canMoveToFoundation(cardToMove: Card, foundationPile: Card[]): boolean {
  const topCard = foundationPile[foundationPile.length - 1];
  if (!topCard) {
    return cardToMove.rank === 'A';
  }
  const suitsMatch = cardToMove.suit === topCard.suit;
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  return suitsMatch && ranksCorrect;
}

export function isGameWon(state: GameState): boolean {
  return state.foundation.every(pile => pile.length === 13);
}

// Helper to check if a sequence of cards in a tableau is valid to move
export function isRun(cards: Card[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i++) {
    if (getCardColor(cards[i]) === getCardColor(cards[i+1])) return false;
    if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
  }
  return true;
}


// Calculate how many cards can be moved at once
export function getMovableCardCount(state: GameState): number {
  const emptyFreecells = state.freecells.filter(c => c === null).length;
  const emptyTableauPiles = state.tableau.filter(p => p.length === 0).length;
  // (1 + number of empty freecells) * 2 ^ (number of empty tableau piles)
  return (1 + emptyFreecells) * Math.pow(2, emptyTableauPiles);
};
