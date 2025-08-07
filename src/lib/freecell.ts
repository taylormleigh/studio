
import { Card, Suit, Rank, SUITS, RANKS, shuffleDeck, createDeck, getCardColor, last } from './solitaire';
import { GameMove, LocatedCard } from './game-logic';

export type { Card, Suit, Rank };

export interface GameState {
  gameType: 'Freecell';
  tableau: Card[][];
  foundation: Card[][];
  freecells: (Card | null)[];
  moves: number;
  score: number;
}

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates the initial game state for a new game of Freecell.
 * All 52 cards are dealt face-up into the 8 tableau piles.
 * @returns A new GameState object.
 */
export function createInitialState(): GameState {
  console.log(`[${new Date().toISOString()}] freecell.ts: createInitialState called`);
  const deck = shuffleDeck(createDeck()).map(c => ({ ...c, faceUp: true }));
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);
  
  // Deal all cards to the tableau.
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

/**
 * Checks if a card can be legally moved to a tableau pile.
 */
export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToTableau called`, { cardToMove, destinationCard });
  if (!destinationCard) {
    console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToTableau - destination is empty, valid`);
    return true; 
  }
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  const result = !colorsMatch && ranksCorrect;
  console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToTableau - colorsMatch: ${colorsMatch}, ranksCorrect: ${ranksCorrect}, result: ${result}`);
  return result;
}

/**
 * Checks if a card can be legally moved to a foundation pile.
 */
export function canMoveToFoundation(cardToMove: Card, foundationPile: Card[]): boolean {
  console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToFoundation called`, { cardToMove, foundationPile });
  const topCard = last(foundationPile);
  if (!topCard) {
    const result = cardToMove.rank === 'A';
    console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToFoundation - foundation empty, card is Ace: ${result}`);
    return result;
  }
  const suitsMatch = cardToMove.suit === topCard.suit;
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  const result = suitsMatch && ranksCorrect;
  console.log(`[${new Date().toISOString()}] freecell.ts: canMoveToFoundation - suitsMatch: ${suitsMatch}, ranksCorrect: ${ranksCorrect}, result: ${result}`);
  return result;
}

/**
 * Checks if the game has been won (all cards are in the foundation piles).
 */
export function isGameWon(state: GameState): boolean {
  console.log(`[${new Date().toISOString()}] freecell.ts: isGameWon called`);
  const result = state.foundation.every(pile => pile.length === 13);
  console.log(`[${new Date().toISOString()}] freecell.ts: isGameWon - result: ${result}`);
  return result;
}

/**
 * Checks if a stack of cards forms a valid run (alternating colors, descending rank).
 */
export function isRun(cards: Card[]): boolean {
  console.log(`[${new Date().toISOString()}] freecell.ts: isRun called`, { cards });
  if (cards.length <= 1) {
      console.log(`[${new Date().toISOString()}] freecell.ts: isRun - card count <= 1, valid`);
      return true;
  }
  for (let i = 0; i < cards.length - 1; i++) {
    if (getCardColor(cards[i]) === getCardColor(cards[i+1])) {
        console.log(`[${new Date().toISOString()}] freecell.ts: isRun - same color found, invalid`);
        return false;
    }
    if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) {
        console.log(`[${new Date().toISOString()}] freecell.ts: isRun - rank not sequential, invalid`);
        return false;
    }
  }
  console.log(`[${new Date().toISOString()}] freecell.ts: isRun - valid run`);
  return true;
}


/**
 * Calculates how many cards can be moved at once based on the number of available
 * empty freecells and empty tableau piles.
 */
export function getMovableCardCount(state: GameState, isDestinationEmpty: boolean): number {
    console.log(`[${new Date().toISOString()}] freecell.ts: getMovableCardCount called`, { isDestinationEmpty });
    const emptyFreecells = state.freecells.filter(c => c === null).length;
    let emptyTableauPiles = state.tableau.filter(p => p.length === 0).length;
    if (isDestinationEmpty && emptyTableauPiles > 0) {
        console.log(`[${new Date().toISOString()}] freecell.ts: getMovableCardCount - destination is empty, reducing empty tableau count for calculation`);
        emptyTableauPiles--;
    }
    const result = (1 + emptyFreecells) * (2 ** emptyTableauPiles);
    console.log(`[${new Date().toISOString()}] freecell.ts: getMovableCardCount - emptyFreecells: ${emptyFreecells}, emptyTableauPiles: ${emptyTableauPiles}, result: ${result}`);
    return result;
};

/**
 * Finds the highest-priority valid auto-move for a given card/stack in Freecell.
 * Priority: Foundation -> Tableau -> Freecell.
 */
export function findAutoMoveForFreecell(gs: GameState, selectedCard: LocatedCard): GameMove | null {
    console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell called`, { selectedCard });
    const cardsToMove = getCardsToMoveFromSource(gs, selectedCard.location);
    if (cardsToMove.length === 0) {
        console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - no cards to move`);
        return null;
    }
    const cardToMove = cardsToMove[0];

    // Priority 1: Try to move a single card to any foundation pile.
    if (cardsToMove.length === 1) {
        console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - checking foundation`);
        for (let i = 0; i < gs.foundation.length; i++) {
            if (canMoveToFoundation(cardToMove, gs.foundation[i])) {
                console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - found valid move to foundation pile ${i}`);
                return { source: selectedCard.location, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }

    // Priority 2: Try to move the stack to any other tableau pile.
    console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - checking tableau`);
    for (let i = 0; i < gs.tableau.length; i++) {
        if (selectedCard.location.type === 'tableau' && selectedCard.location.pileIndex === i) continue;
        if (canMoveToTableau(cardToMove, last(gs.tableau[i]))) {
            const isDestEmpty = gs.tableau[i].length === 0;
            const maxMove = getMovableCardCount(gs, isDestEmpty);
            if(cardsToMove.length <= maxMove) {
                console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - found valid move to tableau pile ${i}`);
                return { source: selectedCard.location, destination: { type: 'tableau', pileIndex: i } };
            }
        }
    }

    // Priority 3: Try to move a single card to an empty freecell.
    if (cardsToMove.length === 1) {
        console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - checking freecells`);
        const emptyCellIndex = gs.freecells.findIndex(cell => cell === null);
        if (emptyCellIndex !== -1) {
            console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - found valid move to freecell ${emptyCellIndex}`);
            return { source: selectedCard.location, destination: { type: 'freecell', pileIndex: emptyCellIndex } };
        }
    }

    console.log(`[${new Date().toISOString()}] freecell.ts: findAutoMoveForFreecell - no valid auto-move found`);
    return null;
}

function getCardsToMoveFromSource(gs: GameState, source: LocatedCard['location']): Card[] {
    console.log(`[${new Date().toISOString()}] freecell.ts: getCardsToMoveFromSource called`, { source });
    if (source.type === 'tableau') {
        return gs.tableau[source.pileIndex]?.slice(source.cardIndex) || [];
    }
    if (source.type === 'freecell') {
        const card = gs.freecells[source.pileIndex];
        return card ? [card] : [];
    }
    return [];
}
