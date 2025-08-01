
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
        tableau: [],
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
    let state: GameState;

    beforeEach(() => {
        state = {
            gameType: 'Freecell',
            tableau: Array.from({ length: 8 }, () => []),
            foundation: Array.from({ length: 4 }, () => []),
            freecells: [null, null, null, null],
            moves: 0,
            score: 0,
        };
    });

    it('should allow moving 1 card with all freecells full', () => {
        state.freecells = [
            { suit: 'HEARTS', rank: 'A', faceUp: true },
            { suit: 'DIAMONDS', rank: 'A', faceUp: true },
            { suit: 'CLUBS', rank: 'A', faceUp: true },
            { suit: 'SPADES', rank: 'A', faceUp: true },
        ];
        // 1 + 0 empty freecells = 1
        expect(getMovableCardCount(state, true)).toBe(1);
        expect(getMovableCardCount(state, false)).toBe(1);
    });

    it('should allow moving 2 cards with 1 empty freecell', () => {
        state.freecells = [null, { suit: 'DIAMONDS', rank: 'A', faceUp: true }, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }];
        // 1 + 1 empty freecell = 2
        expect(getMovableCardCount(state, true)).toBe(2);
        expect(getMovableCardCount(state, false)).toBe(2);
    });
    
    it('should allow moving 3 cards with 2 empty freecells', () => {
        state.freecells = [null, null, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }];
        // 1 + 2 empty freecells = 3
        expect(getMovableCardCount(state, true)).toBe(3);
        expect(getMovableCardCount(state, false)).toBe(3);
    });

    it('should allow moving 4 cards with 3 empty freecells', () => {
        state.freecells = [null, null, null, { suit: 'SPADES', rank: 'A', faceUp: true }];
        // 1 + 3 empty freecells = 4
        expect(getMovableCardCount(state, true)).toBe(4);
        expect(getMovableCardCount(state, false)).toBe(4);
    });

    it('should allow moving 5 cards with 4 empty freecells', () => {
        state.freecells = [null, null, null, null];
        // 1 + 4 empty freecells = 5
        expect(getMovableCardCount(state, true)).toBe(5);
        expect(getMovableCardCount(state, false)).toBe(5);
    });

    it('should allow moving 10 cards with 4 empty freecells and 1 empty tableau pile (when moving to an empty pile)', () => {
        state.freecells = [null, null, null, null]; // 4 empty freecells
        state.tableau[0] = []; // 1 empty tableau pile
        // (1 + 4 empty freecells) * 2^(1 empty tableau pile) = 5 * 2 = 10
        expect(getMovableCardCount(state, true)).toBe(10);
    });
    
    it('should allow moving 5 cards with 4 empty freecells and 1 empty tableau pile (when moving to a non-empty pile)', () => {
        state.freecells = [null, null, null, null]; // 4 empty freecells
        state.tableau[0] = []; // 1 empty tableau pile
        // The destination pile is not empty, so the empty tableau pile count remains 1, but the formula doesn't use the multiplier in this context.
        // It's just (1 + 4 empty freecells) = 5
        expect(getMovableCardCount(state, false)).toBe(5);
    });

    it('should calculate correctly with a mix of empty cells and piles', () => {
      state.freecells = [null, null, { suit: 'CLUBS', rank: 'A', faceUp: true }, { suit: 'SPADES', rank: 'A', faceUp: true }]; // 2 empty cells
      state.tableau[0] = [];
      state.tableau[1] = []; // 2 empty piles
      
      // Moving to an empty pile: (1 + 2 empty freecells) * 2^(2 empty tableau piles) = 3 * 4 = 12
      expect(getMovableCardCount(state, true)).toBe(12);

      // Moving to a non-empty pile: 1 + 2 empty freecells = 3
      expect(getMovableCardCount(state, false)).toBe(3);
    });
  });

  describe('Card Movement Simulation', () => {
    let state: GameState;
  
    beforeEach(() => {
        // Use a predictable, non-random state for movement tests
        state = {
            gameType: 'Freecell',
            tableau: [
                [{ suit: 'HEARTS', rank: 'K', faceUp: true }, { suit: 'CLUBS', rank: 'Q', faceUp: true }],
                [{ suit: 'DIAMONDS', rank: '10', faceUp: true }],
                [], [], [], [], [], []
            ],
            foundation: [[], [], [], []],
            freecells: [null, null, null, null],
            moves: 0,
            score: 0,
        };
    });
  
    it('should correctly move a single card from tableau to an empty freecell', () => {
      const cardToMove = last(state.tableau[0])!;
      
      // Simulate the move
      const movedCard = state.tableau[0].pop();
      state.freecells[0] = movedCard!;

      expect(state.freecells[0]).toEqual(cardToMove);
      expect(state.tableau[0].length).toBe(1); 
    });

    it('should correctly move a single card from tableau to foundation', () => {
      // Add an ace to the tableau to test moving it
      const ace: Card = { suit: 'HEARTS', rank: 'A', faceUp: true };
      state.tableau[2] = [ace];
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
        const sourcePileIndex = 0;
        const destPileIndex = 1;
        
        // Setup specific state for this test
        state.tableau[sourcePileIndex] = [
            { suit: 'DIAMONDS', rank: 'K', faceUp: true },
            ...cardsToMove
        ];
        state.tableau[destPileIndex] = [{ suit: 'CLUBS', rank: '6', faceUp: true }];
        state.freecells = [null, null, null, null]; // 4 empty freecells
        
        const movableCount = getMovableCardCount(state, false); // moving to non-empty pile
        expect(movableCount).toBe(5);
        const sourceCardIndex = state.tableau[sourcePileIndex].length - cardsToMove.length;
        const destCard = last(state.tableau[destPileIndex]);

        if(isRun(cardsToMove) && canMoveToTableau(cardsToMove[0], destCard) && cardsToMove.length <= movableCount) {
            const moved = state.tableau[sourcePileIndex].splice(sourceCardIndex);
            state.tableau[destPileIndex].push(...moved);
        }

        expect(state.tableau[sourcePileIndex].length).toBe(1);
        expect(state.tableau[destPileIndex].length).toBe(3);
        expect(last(state.tableau[destPileIndex])!.rank).toBe('4');
    });

    it('should not move a stack of cards larger than the movable limit', () => {
        const cardsToMove: Card[] = [
            { suit: 'SPADES', rank: '5', faceUp: true },
            { suit: 'HEARTS', rank: '4', faceUp: true },
            { suit: 'CLUBS', rank: '3', faceUp: true },
        ];
        const sourcePileIndex = 0;
        const destPileIndex = 1;
    
        state.tableau[sourcePileIndex] = [...cardsToMove];
        state.tableau[destPileIndex] = [{ suit: 'CLUBS', rank: '6', faceUp: true }];
        // No empty freecells or tableau piles, so limit is 1
        state.freecells = [
            { suit: 'DIAMONDS', rank: 'K', faceUp: true },
            { suit: 'HEARTS', rank: 'J', faceUp: true },
            { suit: 'CLUBS', rank: 'A', faceUp: true },
            { suit: 'SPADES', rank: '2', faceUp: true },
        ];
        
        const movableCount = getMovableCardCount(state, false); // moving to non-empty
        expect(movableCount).toBe(1);
        expect(cardsToMove.length).toBe(3); // Attempting to move 3 cards
        
        const originalSourcePile = JSON.parse(JSON.stringify(state.tableau[sourcePileIndex]));
        const originalDestPile = JSON.parse(JSON.stringify(state.tableau[destPileIndex]));
    
        // This condition should be false, so the move doesn't happen
        if (isRun(cardsToMove) && canMoveToTableau(cardsToMove[0], last(state.tableau[destPileIndex])) && cardsToMove.length <= movableCount) {
            const sourceCardIndex = state.tableau[sourcePileIndex].length - cardsToMove.length;
            const movedCards = state.tableau[sourcePileIndex].splice(sourceCardIndex);
            state.tableau[destPileIndex].push(...movedCards);
        }
    
        // Assert that state remains unchanged
        expect(state.tableau[sourcePileIndex]).toEqual(originalSourcePile);
        expect(state.tableau[destPileIndex]).toEqual(originalDestPile);
    });

  });
});

    