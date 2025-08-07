
import { GameMove, LocatedCard } from './game-logic';

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type Pile = Card[];

export interface GameState {
  gameType: 'Solitaire';
  tableau: Pile[];
  foundation: Pile[];
  stock: Pile;
  waste: Pile;
  drawCount: 1 | 3;
  score: number;
  moves: number;
}

export const SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Map card ranks to numerical values for comparison.
const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * Creates a standard 52-card deck.
 * @returns An array of Card objects.
 */
export function createDeck(): Card[] {
  console.log(`[${new Date().toISOString()}] solitaire.ts: createDeck called`);
  return SUITS.flatMap(suit =>
    RANKS.map(rank => ({ suit, rank, faceUp: false }))
  );
}

/**
 * Shuffles an array of cards using the Fisher-Yates algorithm.
 * @param array The array of cards to shuffle.
 * @returns The shuffled array.
 */
export function shuffleDeck(array: any[]) {
    console.log(`[${new Date().toISOString()}] solitaire.ts: shuffleDeck called`);
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

/**
 * Creates the initial game state for a new game of Klondike Solitaire.
 * @param drawCount The number of cards to draw from the stock at a time (1 or 3).
 * @returns A new GameState object.
 */
export function createInitialState(drawCount: 1 | 3 = 1): GameState {
  console.log(`[${new Date().toISOString()}] solitaire.ts: createInitialState called`, { drawCount });
  const deck = shuffleDeck(createDeck());
  const tableau: Pile[] = Array.from({ length: 7 }, () => []);
  
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      tableau[j].push(deck.pop()!);
    }
  }

  tableau.forEach(pile => {
    if (last(pile)) {
      last(pile)!.faceUp = true;
    }
  });

  return {
    gameType: 'Solitaire',
    tableau,
    foundation: [[], [], [], []],
    stock: deck,
    waste: [],
    drawCount,
    score: 0,
    moves: 0,
  };
}

/**
 * Determines the color of a card.
 * @param card The card to check.
 * @returns 'red' or 'black'.
 */
export function getCardColor(card: Card): 'red' | 'black' {
  return card.suit === 'HEARTS' || card.suit === 'DIAMONDS' ? 'red' : 'black';
}

/**
 * Checks if a card can be legally moved to a tableau pile.
 * @param cardToMove The card (or bottom card of a stack) to be moved.
 * @param destinationCard The card at the top of the destination tableau pile. Can be undefined if the pile is empty.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToTableau(cardToMove: Card, destinationCard: Card | undefined): boolean {
  console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToTableau called`, { cardToMove, destinationCard });
  // If the destination pile is empty, only a King can be moved there.
  if (!destinationCard) {
    const result = cardToMove.rank === 'K';
    console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToTableau - destination empty, card is King: ${result}`);
    return result;
  }
  // The destination card must be face-up to accept a new card.
  if (!destinationCard.faceUp) {
    console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToTableau - destination card is face down, invalid`);
    return false;
  }
  // The card to move must be of the opposite color to the destination card.
  const colorsMatch = getCardColor(cardToMove) === getCardColor(destinationCard);
  // The card to move must be one rank lower than the destination card.
  const ranksCorrect = RANK_VALUES[destinationCard.rank] === RANK_VALUES[cardToMove.rank] + 1;
  
  const result = !colorsMatch && ranksCorrect;
  console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToTableau - colorsMatch: ${colorsMatch}, ranksCorrect: ${ranksCorrect}, result: ${result}`);
  return result;
}

/**
 * Checks if a card can be legally moved to a foundation pile.
 * @param cardToMove The card to be moved.
 * @param foundationPile The specific foundation pile to move to.
 * @returns True if the move is valid, false otherwise.
 */
export function canMoveToFoundation(cardToMove: Card, foundationPile: Card[]): boolean {
  console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToFoundation called`, { cardToMove, foundationPile });
  const topCard = last(foundationPile);
  // If the foundation pile is empty, only an Ace can be moved there.
  if (!topCard) {
    const result = cardToMove.rank === 'A';
    console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToFoundation - foundation empty, card is Ace: ${result}`);
    return result;
  }
  // The card must be of the same suit as the foundation pile.
  const suitsMatch = cardToMove.suit === topCard.suit;
  // The card must be one rank higher than the card currently on top of the pile.
  const ranksCorrect = RANK_VALUES[cardToMove.rank] === RANK_VALUES[topCard.rank] + 1;
  
  const result = suitsMatch && ranksCorrect;
  console.log(`[${new Date().toISOString()}] solitaire.ts: canMoveToFoundation - suitsMatch: ${suitsMatch}, ranksCorrect: ${ranksCorrect}, result: ${result}`);
  return result;
}

/**
 * Checks if the game has been won (all cards are in the foundation piles).
 * @param state The current game state.
 * @returns True if the game is won, false otherwise.
 */
export function isGameWon(state: GameState): boolean {
  console.log(`[${new Date().toISOString()}] solitaire.ts: isGameWon called`);
  const result = state.foundation.every(pile => pile.length === 13);
  console.log(`[${new Date().toISOString()}] solitaire.ts: isGameWon - result: ${result}`);
  return result;
}

/**
 * Checks if a stack of cards forms a valid run for moving (alternating colors, descending rank).
 * @param cards The stack of cards to check.
 * @returns True if the stack is a valid run, false otherwise.
 */
export function isRun(cards: Card[]): boolean {
  console.log(`[${new Date().toISOString()}] solitaire.ts: isRun called`, { cards });
  // A single card is always a valid run.
  if (cards.length <= 1) {
    console.log(`[${new Date().toISOString()}] solitaire.ts: isRun - card count <= 1, valid`);
    return true;
  }
  // Iterate through the stack to check the color and rank rules between adjacent cards.
  for (let i = 0; i < cards.length - 1; i++) {
    // Check for alternating colors.
    if (getCardColor(cards[i]) === getCardColor(cards[i+1])) {
        console.log(`[${new Date().toISOString()}] solitaire.ts: isRun - same color found, invalid`);
        return false;
    }
    // Check for descending rank.
    if (RANK_VALUES[cards[i].rank] !== RANK_VALUES[cards[i+1].rank] + 1) {
        console.log(`[${new Date().toISOString()}] solitaire.ts: isRun - rank not sequential, invalid`);
        return false;
    }
  }
  console.log(`[${new Date().toISOString()}] solitaire.ts: isRun - valid run`);
  return true;
}

/**
 * Finds the highest-priority valid auto-move for a clicked card or stack in Solitaire.
 * @param gs The current game state.
 * @param selectedCard The card that was clicked, including its location.
 * @returns A valid GameMove object if a move is found, otherwise null.
 */
export function findAutoMoveForSolitaire(gs: GameState, selectedCard: LocatedCard): GameMove | null {
    console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire called`, { selectedCard });
    const { location } = selectedCard;
    
    // Determine the actual card or stack of cards to be moved.
    let cardsToMove: Card[];
    if (location.type === 'tableau') {
        const sourcePile = gs.tableau[location.pileIndex];
        const stack = sourcePile.slice(location.cardIndex);
        cardsToMove = isRun(stack) ? stack : [];
    } else if (location.type === 'waste') {
        const wasteCard = last(gs.waste);
        cardsToMove = wasteCard ? [wasteCard] : [];
    } else {
        cardsToMove = [];
    }

    if (cardsToMove.length === 0) {
        console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - no cards to move`);
        return null;
    }
    
    const cardToMove = cardsToMove[0];

    // Priority 1: Check foundation piles (only for single-card moves).
    if (cardsToMove.length === 1) {
        console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - checking foundation`);
        for (let i = 0; i < gs.foundation.length; i++) {
            if (canMoveToFoundation(cardToMove, gs.foundation[i])) {
                console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - found valid move to foundation pile ${i}`);
                return { source: location, destination: { type: 'foundation', pileIndex: i } };
            }
        }
    }

    // Priority 2: Check tableau piles.
    console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - checking tableau`);
    for (let i = 0; i < gs.tableau.length; i++) {
        // Skip moving to the same pile.
        if (location.type === 'tableau' && location.pileIndex === i) continue;

        if (canMoveToTableau(cardToMove, last(gs.tableau[i]))) {
            console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - found valid move to tableau pile ${i}`);
            return { source: location, destination: { type: 'tableau', pileIndex: i } };
        }
    }
    
    console.log(`[${new Date().toISOString()}] solitaire.ts: findAutoMoveForSolitaire - no valid auto-move found`);
    return null;
}


/**
 * Safely gets the first card of a pile.
 * @param pile The pile to get the card from.
 * @returns The first card, or undefined if the pile is empty.
 */
export function first(pile: Pile): Card | undefined {
    return pile.length > 0 ? pile[0] : undefined;
}

/**
 * Safely gets the last card of a pile.
 * @param pile The pile to get the card from.
 * @returns The last card, or undefined if the pile is empty.
 */
export function last(pile: Pile): Card | undefined {
    return pile.length > 0 ? pile[pile.length - 1] : undefined;
}
