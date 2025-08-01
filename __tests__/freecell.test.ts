
import { createInitialState, canMoveToTableau, canMoveToFoundation, isGameWon, isRun, getMovableCardCount, GameState, Card } from '../src/lib/freecell';
import { last } from '../src/lib/solitaire';

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
        // (1 + 0 empty freecells) * 2^0 = 1
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
        // (1 + 1 empty freecell) * 2^0 = 2
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
        // (1 + 3 empty freecells) * 2^0 = 4
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
        // (1 + 4 empty freecells) * 2^0 = 5
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
  
    it('should correctly move a single card from tableau to an empty freecell', () => {
        const cardToMove: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };
        const state: GameState = {
            gameType: 'Freecell',
            tableau: [
                [{ suit: 'HEARTS', rank: 'K', faceUp: true }, cardToMove],
                [{ suit: 'DIAMONDS', rank: '10', faceUp: true }],
                [], [], [], [], [], []
            ],
            foundation: [[], [], [], []],
            freecells: [null, null, null, null],
            moves: 0,
            score: 0,
        };
      
      // Simulate the move
      const movedCard = state.tableau[0].pop();
      state.freecells[0] = movedCard!;

      expect(state.freecells[0]).toEqual(cardToMove);
      expect(state.tableau[0].length).toBe(1); 
    });

    it('should correctly move a single card from tableau to foundation', () => {
      const ace: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      const state: GameState = {
        gameType: 'Freecell',
        tableau: [
            [], [{ suit: 'DIAMONDS', rank: '10', faceUp: true }], [ace], 
            [], [], [], [], []
        ],
        foundation: [[], [], [], []],
        freecells: [null, null, null, null],
        moves: 0, score: 0
      };
      const initialTableauSize = state.tableau[2].length;
      
      const card = state.tableau[2].pop()!;
      // Find the correct foundation pile (empty in this case)
      const foundationIndex = 0; 
      if (canMoveToFoundation(card, state.foundation[foundationIndex])) {
        state.foundation[foundationIndex].push(card);
      }

      expect(last(state.foundation[foundationIndex])).toEqual(ace);
      expect(state.tableau[2].length).toBe(initialTableauSize - 1);
    });

    it('should move a valid stack of cards between tableau piles', () => {
      const cardsToMove: Card[] = [
        { suit: 'SPADES', rank: '5', faceUp: true },
        { suit: 'HEARTS', rank: '4', faceUp: true },
      ];
      
      const specificState: GameState = {
          gameType: 'Freecell',
          tableau: [
              [{ suit: 'DIAMONDS', rank: 'K', faceUp: true }, ...cardsToMove],
              [{ suit: 'CLUBS', rank: '6', faceUp: true }],
               [], [], [], [], [], []
          ],
          foundation: [],
          freecells: [null, null, null, null], // 4 empty freecells
          moves: 0, score: 0
      };
      
      const sourcePileIndex = 0;
      const destPileIndex = 1;
      const sourceCardIndex = 1; // index of the '5 of Spades'

      const movableCount = getMovableCardCount(specificState, false); // Moving to non-empty
      const stackToMove = specificState.tableau[sourcePileIndex].slice(sourceCardIndex);
      const destCard = last(specificState.tableau[destPileIndex]);

      // This condition mimics the logic in the game board component
      if(isRun(stackToMove) && canMoveToTableau(stackToMove[0], destCard) && stackToMove.length <= movableCount) {
          const moved = specificState.tableau[sourcePileIndex].splice(sourceCardIndex);
          specificState.tableau[destPileIndex].push(...moved);
      }

      expect(specificState.tableau[sourcePileIndex].length).toBe(1);
      expect(specificState.tableau[destPileIndex].length).toBe(3);
      expect(last(specificState.tableau[destPileIndex])!.rank).toBe('4');
  });

    it('should not move a stack of cards larger than the movable limit', () => {
      const cardsToMove: Card[] = [
          { suit: 'SPADES', rank: '5', faceUp: true },
          { suit: 'HEARTS', rank: '4', faceUp: true },
          { suit: 'CLUBS', rank: '3', faceUp: true },
      ];
      
      const specificState: GameState = {
          gameType: 'Freecell',
          tableau: [
              [{ suit: 'DIAMONDS', rank: 'K', faceUp: true }, ...cardsToMove],
              [{ suit: 'CLUBS', rank: '6', faceUp: true }],
               [], [], [], [], [], []
          ],
          foundation: [],
          freecells: [ 
              { suit: 'DIAMONDS', rank: 'A', faceUp: true },
              { suit: 'HEARTS', rank: 'J', faceUp: true },
              { suit: 'CLUBS', rank: 'A', faceUp: true },
              { suit: 'SPADES', rank: '2', faceUp: true },
          ],
          moves: 0, score: 0
      };

      const sourcePileIndex = 0;
      const destPileIndex = 1;
      const sourceCardIndex = 1;
      
      // All freecells are full, no empty tableau piles, so we can only move 1 card.
      const movableCount = getMovableCardCount(specificState, false); // moving to non-empty
      const stackToMove = specificState.tableau[sourcePileIndex].slice(sourceCardIndex);
      
      const originalSourcePileJSON = JSON.stringify(specificState.tableau[sourcePileIndex]);
      const originalDestPileJSON = JSON.stringify(specificState.tableau[destPileIndex]);
  
      // This condition mimics the game board logic. It will be false, so no move happens.
      if (isRun(stackToMove) && canMoveToTableau(stackToMove[0], last(specificState.tableau[destPileIndex])) && stackToMove.length <= movableCount) {
          // This block should not be executed.
          const movedCards = specificState.tableau[sourcePileIndex].splice(sourceCardIndex);
          specificState.tableau[destPileIndex].push(...movedCards);
      }
  
      // Assert that state remains unchanged because the move was invalid.
      expect(JSON.stringify(specificState.tableau[sourcePileIndex])).toEqual(originalSourcePileJSON);
      expect(JSON.stringify(specificState.tableau[destPileIndex])).toEqual(originalDestPileJSON);
  });

  });
});
