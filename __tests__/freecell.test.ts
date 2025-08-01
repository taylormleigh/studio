
import { createInitialState, canMoveToTableau, canMoveToFoundation, isGameWon, isRun, getMovableCardCount, GameState, Card } from '../src/lib/freecell';
import { last } from '../src/lib/solitaire';

// This helper function simulates the core logic that will exist in the GameBoard component.
// It ensures our tests are validating the rules in the same way the UI will.
const moveCardsInTest = (
  state: GameState,
  sourceType: 'tableau' | 'freecell',
  sourcePileIndex: number,
  sourceCardIndex: number,
  destType: 'tableau' | 'freecell' | 'foundation',
  destPileIndex: number
): GameState => {
  const newGameState = JSON.parse(JSON.stringify(state));
  let cardsToMove: Card[];

  if (sourceType === 'tableau') {
    cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
  } else { // freecell
    const card = newGameState.freecells[sourcePileIndex];
    if (!card) return state; // No card to move
    cardsToMove = [card];
  }

  if (cardsToMove.length === 0) return state;

  const cardToMove = cardsToMove[0];

  // Determine if the destination is an empty tableau pile before the move
  const isDestinationEmptyTableau = destType === 'tableau' && newGameState.tableau[destPileIndex].length === 0;
  const movableCount = getMovableCardCount(newGameState, isDestinationEmptyTableau);
  
  if (cardsToMove.length > movableCount) {
    return state; // Move is invalid because the stack is too large
  }

  if (!isRun(cardsToMove)) {
    return state; // The stack being moved isn't a valid run
  }

  let moveSuccessful = false;

  if (destType === 'tableau') {
    const destCard = last(newGameState.tableau[destPileIndex]);
    if (canMoveToTableau(cardToMove, destCard)) {
      newGameState.tableau[destPileIndex].push(...cardsToMove);
      moveSuccessful = true;
    }
  } else if (destType === 'foundation') {
    if (cardsToMove.length === 1 && canMoveToFoundation(cardToMove, newGameState.foundation[destPileIndex])) {
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
    if (sourceType === 'tableau') {
      newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
    } else { // freecell
      newGameState.freecells[sourcePileIndex] = null;
    }
    newGameState.moves++;
    return newGameState;
  }

  return state; // Return original state if move was invalid
};


describe('Freecell Game Logic', () => {

  describe('createInitialState', () => {
    it('should create a valid initial game state', () => {
      const state = createInitialState();
      expect(state.tableau.length).toBe(8);
      expect(state.tableau[0].length).toBe(7); // 52 cards / 8 piles = 6.5 -> 4 piles with 7, 4 with 6
      expect(state.tableau[4].length).toBe(6);
      expect(state.tableau.every(pile => pile.every(card => card.faceUp))).toBe(true);
      expect(state.foundation.length).toBe(4);
      expect(state.freecells.length).toBe(4);
      expect(state.freecells.every(cell => cell === null)).toBe(true);
      const totalCards = state.tableau.reduce((sum, pile) => sum + pile.length, 0);
      expect(totalCards).toBe(52);
    });
  });

  describe('canMoveToTableau', () => {
    it('should allow moving any card to an empty tableau pile', () => {
      const king: Card = { suit: 'SPADES', rank: 'K', faceUp: true };
      const queen: Card = { suit: 'HEARTS', rank: 'Q', faceUp: true };
      expect(canMoveToTableau(king, undefined)).toBe(true);
      expect(canMoveToTableau(queen, undefined)).toBe(true);
    });

    it('should allow moving a card of opposite color and one rank lower', () => {
      const redTen: Card = { suit: 'HEARTS', rank: '10', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(redTen, blackJack)).toBe(true);
    });

    it('should not allow moving a card of the same color', () => {
      const blackTen: Card = { suit: 'SPADES', rank: '10', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(blackTen, blackJack)).toBe(false);
    });

    it('should not allow moving a card of non-sequential rank', () => {
      const redNine: Card = { suit: 'HEARTS', rank: '9', faceUp: true };
      const blackJack: Card = { suit: 'CLUBS', rank: 'J', faceUp: true };
      expect(canMoveToTableau(redNine, blackJack)).toBe(false);
    });
  });

  describe('canMoveToFoundation', () => {
    it('should allow moving an Ace to an empty foundation pile', () => {
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(aceOfHearts, [])).toBe(true);
    });

    it('should not allow moving a non-Ace to an empty foundation pile', () => {
      const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      expect(canMoveToFoundation(twoOfHearts, [])).toBe(false);
    });

    it('should allow moving a card of the same suit and one rank higher', () => {
      const twoOfHearts: Card = { suit: 'HEARTS', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfHearts, [aceOfHearts])).toBe(true);
    });

    it('should not allow moving a card of a different suit', () => {
      const twoOfSpades: Card = { suit: 'SPADES', rank: '2', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(twoOfSpades, [aceOfHearts])).toBe(false);
    });

    it('should not allow moving a card of a non-sequential rank', () => {
      const threeOfHearts: Card = { suit: 'HEARTS', rank: '3', faceUp: true };
      const aceOfHearts: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      expect(canMoveToFoundation(threeOfHearts, [aceOfHearts])).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('should return true when all foundation piles are full', () => {
      const state: GameState = {
        gameType: 'Freecell',
        tableau: Array.from({ length: 8 }, () => []),
        foundation: [
            [...Array(13)].map((_, i) => ({ suit: 'HEARTS', rank: 'A', faceUp: true })),
            [...Array(13)].map((_, i) => ({ suit: 'DIAMONDS', rank: 'A', faceUp: true })),
            [...Array(13)].map((_, i) => ({ suit: 'CLUBS', rank: 'A', faceUp: true })),
            [...Array(13)].map((_, i) => ({ suit: 'SPADES', rank: 'A', faceUp: true })),
        ],
        freecells: [null, null, null, null],
        moves: 0,
        score: 0,
      };
      expect(isGameWon(state)).toBe(true);
    });

    it('should return false when foundation piles are not full', () => {
      const state = createInitialState();
      expect(isGameWon(state)).toBe(false);
    });
  });

  describe('isRun', () => {
    it('should return true for a valid run', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'HEARTS', rank: '10', faceUp: true },
            { suit: 'SPADES', rank: '9', faceUp: true },
        ];
        expect(isRun(run)).toBe(true);
    });

    it('should return false for a run with same-color cards', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true }, // Invalid
            { suit: 'HEARTS', rank: '9', faceUp: true },
        ];
        expect(isRun(run)).toBe(false);
    });

    it('should return false for a run with non-sequential ranks', () => {
        const run: Card[] = [
            { suit: 'CLUBS', rank: 'J', faceUp: true },
            { suit: 'HEARTS', rank: '9', faceUp: true }, // Invalid
            { suit: 'SPADES', rank: '8', faceUp: true },
        ];
        expect(isRun(run)).toBe(false);
    });

    it('should return true for a single card', () => {
        expect(isRun([{ suit: 'CLUBS', rank: 'J', faceUp: true }])).toBe(true);
    });
  });

  describe('getMovableCardCount', () => {
    it('should allow moving 1 card with all freecells full and no empty tableau', () => {
        const state: GameState = {
            gameType: 'Freecell',
            tableau: Array.from({ length: 8 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]),
            foundation: Array.from({ length: 4 }, () => []),
            freecells: [
              { suit: 'HEARTS', rank: 'A', faceUp: true },
              { suit: 'DIAMONDS', rank: 'A', faceUp: true },
              { suit: 'CLUBS', rank: 'A', faceUp: true },
              { suit: 'SPADES', rank: 'A', faceUp: true },
            ],
            moves: 0,
            score: 0,
        };
        expect(getMovableCardCount(state, false)).toBe(1);
    });

    it('should allow moving 2 cards with 1 empty freecell and no empty tableau', () => {
        const state: GameState = {
          gameType: 'Freecell',
          tableau: Array.from({ length: 8 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]),
          foundation: Array.from({ length: 4 }, () => []),
          freecells: [null, { suit: 'DIAMONDS', rank: 'A', faceUp: true }, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }],
          moves: 0, score: 0
        };
        expect(getMovableCardCount(state, false)).toBe(2);
    });
    
    it('should allow moving 4 cards with 3 empty freecells and no empty tableau', () => {
        const state: GameState = {
          gameType: 'Freecell',
          tableau: Array.from({ length: 8 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]),
          foundation: Array.from({ length: 4 }, () => []),
          freecells: [null, null, null, { suit: 'SPADES', rank: 'A', faceUp: true }],
          moves: 0, score: 0
        };
        expect(getMovableCardCount(state, false)).toBe(4);
    });

    it('should allow moving 5 cards with 4 empty freecells and no empty tableau', () => {
        const state: GameState = {
          gameType: 'Freecell',
          tableau: Array.from({ length: 8 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]),
          foundation: Array.from({ length: 4 }, () => []),
          freecells: [null, null, null, null],
          moves: 0, score: 0
        };
        expect(getMovableCardCount(state, false)).toBe(5);
    });

    it('should correctly multiply for moving to a NON-EMPTY pile with 2 empty tableau piles', () => {
        const state: GameState = {
            gameType: 'Freecell',
            tableau: [ [], [], ...Array.from({ length: 6 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]) ], // 2 empty
            foundation: [],
            freecells: [null, null, null, null], // 4 empty
            moves: 0, score: 0
        };
        // Moving to a non-empty pile: (1 + 4 empty freecells) * 2^(2 empty tableau piles) = 5 * 4 = 20
        expect(getMovableCardCount(state, false)).toBe(20);
    });
    
    it('should correctly multiply for moving to an EMPTY pile with 3 total empty tableau piles', () => {
        const state: GameState = {
            gameType: 'Freecell',
            tableau: [ [], [], [], ...Array.from({ length: 5 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]) ], // 3 empty
            foundation: [],
            freecells: [null, null, null, null], // 4 empty
            moves: 0, score: 0
        };
        // Moving TO an empty pile, so one empty pile doesn't count for the multiplier
        // (1 + 4 empty freecells) * 2^(3-1 empty tableau piles) = 5 * 2^2 = 5 * 4 = 20
        expect(getMovableCardCount(state, true)).toBe(20);
    });

    it('should calculate correctly with a mix of empty cells and piles', () => {
      const state: GameState = {
        gameType: 'Freecell',
        tableau: [ [], [], ...Array.from({ length: 6 }, () => [{ suit: 'SPADES', rank: 'K', faceUp: true }]) ], // 2 empty
        foundation: Array.from({ length: 4 }, () => []),
        freecells: [null, null, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }], // 2 empty
        moves: 0, score: 0
      };

      // Moving to a non-empty pile: (1 + 2 empty freecells) * 2^(2 empty tableau piles) = 3 * 4 = 12
      expect(getMovableCardCount(state, false)).toBe(12);

      // Moving to an empty pile: (1 + 2 empty freecells) * 2^(2-1 empty tableau piles) = 3 * 2 = 6
      expect(getMovableCardCount(state, true)).toBe(6);
    });
  });

  describe('Card Movement Simulation', () => {
    
    it('should move a valid stack of cards between tableau piles', () => {
      const initialState: GameState = {
          gameType: 'Freecell',
          tableau: [
              [
                { suit: 'DIAMONDS', rank: 'K', faceUp: true },
                { suit: 'SPADES', rank: '5', faceUp: true },
                { suit: 'HEARTS', rank: '4', faceUp: true }
              ],
              [{ suit: 'CLUBS', rank: '6', faceUp: true }],
               [], [], [], [], [], []
          ],
          foundation: [[], [], [], []],
          freecells: [null, null, null, null],
          moves: 0, score: 0
      };
      
      const newState = moveCardsInTest(initialState, 'tableau', 0, 1, 'tableau', 1);

      expect(newState.tableau[0].length).toBe(1); // K of diamonds remains
      expect(newState.tableau[1].length).toBe(3); // 6 of clubs + 5 of spades + 4 of hearts
      expect(last(newState.tableau[1])?.rank).toBe('4');
      expect(newState.moves).toBe(1);
    });

    it('should not move a stack of cards larger than the movable limit', () => {
      const initialState: GameState = {
          gameType: 'Freecell',
          tableau: [
              [
                  { suit: 'DIAMONDS', rank: 'K', faceUp: true },
                  { suit: 'SPADES', rank: '5', faceUp: true },
                  { suit: 'HEARTS', rank: '4', faceUp: true },
                  { suit: 'CLUBS', rank: '3', faceUp: true },
              ],
              [{ suit: 'CLUBS', rank: '6', faceUp: true }],
               [], [], [], [], [], []
          ],
          foundation: [[], [], [], []],
          freecells: [ 
              { suit: 'DIAMONDS', rank: 'A', faceUp: true },
              { suit: 'HEARTS', rank: 'J', faceUp: true },
              { suit: 'CLUBS', rank: 'A', faceUp: true },
              { suit: 'SPADES', rank: '2', faceUp: true },
          ], // All freecells are full
          moves: 0, score: 0
      };

      const newState = moveCardsInTest(initialState, 'tableau', 0, 1, 'tableau', 1);
  
      // The state should not have changed
      expect(newState.tableau[0].length).toBe(4);
      expect(newState.tableau[1].length).toBe(1);
      expect(newState.moves).toBe(0);
      expect(JSON.stringify(newState)).toEqual(JSON.stringify(initialState));
    });

  });
});

    
    