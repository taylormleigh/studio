
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck } from './solitaire';

export type { Card, Suit, Rank };

export type SpiderSuitCount = 1 | 2 | 4;

export interface GameState {
  gameType: 'Spider';
  tableau: Card[][];
  foundation: Card[][];
  stock: Card[];
  completedSets: number;
  suitCount: SpiderSuitCount;
  moves: number;
  score: number;
}

const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

function createSpiderDeck(suitCount: SpiderSuitCount): Card[] {
    const selectedSuits = SUITS.slice(0, suitCount);
    const decksToUse = 8 / suitCount;
    let deck: Card[] = [];
    for(let i=0; i<decksToUse; i++) {
        deck.push(...selectedSuits.flatMap(suit => RANKS.map(rank => ({ suit, rank, faceUp: false }))));
    }
    return deck;
}


export function createInitialState(suitCount: SpiderSuitCount): GameState {
  const deck = shuffleDeck(createSpiderDeck(suitCount));
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  
  // Deal to tableau
  for (let i = 0; i < 54; i++) {
    tableau[i % 10].push(deck.pop()!);
  }

  tableau.forEach(pile => {
    if (pile.length > 0) {
      pile[pile.length - 1].faceUp = true;
    }
  });

  return {
    gameType: 'Spider',
    tableau,
    foundation: [],
    stock: deck, // Remaining 50 cards
    completedSets: 0,
    suitCount,
    moves: 0,
    score: 500, // Starting score
  };
}

function isRun(cards: Card[]): boolean {
    if (cards.length < 1) return false;
    if (cards.length === 1) return true;
    const firstSuit = cards[0].suit;
    for (let i = 0; i < cards.length - 1; i++) {
        // Must be same suit
        if (cards[i].suit !== firstSuit) return false;
        // Must be in descending rank order
        if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) return false;
    }
    return true;
}

export function canMoveToTableau(cardsToMove: Card[], destinationCard: Card | undefined): boolean {
  if (!isRun(cardsToMove)) {
    return false;
  }
  
  const cardToMove = cardsToMove[0];

  if (!destinationCard) {
    return true; // Any valid run can move to an empty tableau pile
  }

  // Can place on a card of one higher rank, regardless of suit
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  return ranksCorrect;
}

export function checkForCompletedSet(tableauPile: Card[]): { updatedPile: Card[], setsCompleted: number, completedSet: Card[] | null } {
    if (tableauPile.length < 13) {
      return { updatedPile: tableauPile, setsCompleted: 0, completedSet: null };
    }
  
    const topThirteen = tableauPile.slice(tableauPile.length - 13);
    const topCard = topThirteen[0];
  
    if (topCard.rank === 'K' && isRun(topThirteen)) {
      // A full run from K to A of the same suit
      return {
        updatedPile: tableauPile.slice(0, tableauPile.length - 13),
        setsCompleted: 1,
        completedSet: topThirteen,
      };
    }
  
    return { updatedPile: tableauPile, setsCompleted: 0, completedSet: null };
}
  

export function isGameWon(state: GameState): boolean {
  // Game is won when 8 sets are completed
  return state.completedSets === 8;
}


    