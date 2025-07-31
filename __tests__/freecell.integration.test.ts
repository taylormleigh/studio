import {
  createInitialState,
  canMoveToTableau,
  canMoveToFoundation,
  getMovableCardCount,
  Card,
  GameState,
} from '../src/lib/freecell';

// This is a simplified representation of the core move logic from the GameBoard component,
// similar to the solitaire integration test.
function moveCardsLogic(
  prevState: GameState,
  sourceType: 'tableau' | 'freecell',
  sourcePileIndex: number,
  sourceCardIndex: number,
  destType: 'tableau' | 'foundation' | 'freecell',
  destPileIndex: number
): GameState {
  const newGameState = JSON.parse(JSON.stringify(prevState));
  let cardToMove: Card;
  let cardsToMove: Card[];

  const movableCount = getMovableCardCount(newGameState);
  const movingCount = sourceType === 'tableau' ? newGameState.tableau[sourcePileIndex].length - sourceCardIndex : 1;
  if(movingCount > movableCount) {
    // In a real scenario, a toast would show. Here, we just return the previous state.
    return prevState;
  }

  if (sourceType === 'tableau') {
    cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
    cardToMove = cardsToMove[0];
  } else if (sourceType === 'freecell') {
    const card = newGameState.freecells[sourcePileIndex];
    if(!card) return prevState;
    cardToMove = card;
    cardsToMove = [card];
  } else {
    return prevState;
  }
  if(!cardToMove) return prevState;

  let moveSuccessful = false;
  if (destType === 'tableau') {
    const destPile = newGameState.tableau[destPileIndex];
    const destTopCard = destPile[destPile.length - 1];
    if (canMoveToTableau(cardToMove, destTopCard)) {
      destPile.push(...cardsToMove);
      moveSuccessful = true;
    }
  } else if (destType === 'foundation') {
    if(cardsToMove.length === 1) {
        const destPile = newGameState.foundation[destPileIndex];
        if(canMoveToFoundation(cardToMove, destPile)) {
            destPile.push(cardToMove);
            moveSuccessful = true;
        }
    }
  } else if (destType === 'freecell') {
    if(cardsToMove.length === 1 && newGameState.freecells[destPileIndex] === null) {
      newGameState.freecells[destPileIndex] = cardToMove;
      moveSuccessful = true;
    }
  }

  if(moveSuccessful) {
      if (sourceType === 'tableau') {
        newGameState.tableau[sourcePileIndex].splice(sourceCardIndex);
      } else { // freecell
        newGameState.freecells[sourcePileIndex] = null;
      }
    newGameState.moves++;
    return newGameState;
  }
  return prevState;
}


describe('Freecell Game Integration Logic', () => {
    let state: GameState;

    beforeEach(() => {
        state = createInitialState();
    });

    it('should correctly move a single card from tableau to an empty freecell', () => {
        // Setup: Get the top card of the first tableau pile
        const cardToMove = state.tableau[0][state.tableau[0].length - 1];
        const originalPileLength = state.tableau[0].length;

        // Simulate the move by calling the actual game logic
        const updatedState = moveCardsLogic(state, 'tableau', 0, originalPileLength - 1, 'freecell', 0);

        // Assertions
        expect(updatedState.tableau[0].length).toBe(originalPileLength - 1); // Source pile has one less card
        expect(updatedState.freecells[0]).toEqual(cardToMove); // Destination freecell has the card
        expect(updatedState.moves).toBe(1);
    });

    it('should correctly move a card from a freecell to a foundation pile', () => {
        // Setup: Place an Ace in a freecell
        const aceOfSpades: Card = { suit: 'SPADES', rank: 'A', faceUp: true };
        state.freecells[0] = aceOfSpades;

        // Simulate the move by calling the actual game logic
        const updatedState = moveCardsLogic(state, 'freecell', 0, 0, 'foundation', 0);

        // Assertions
        expect(updatedState.freecells[0]).toBeNull(); // Source freecell is now empty
        expect(updatedState.foundation[0].length).toBe(1); // Destination foundation has the ace
        expect(updatedState.foundation[0][0]).toEqual(aceOfSpades);
        expect(updatedState.moves).toBe(1);
    });

    it('should correctly move a valid multi-card stack between tableau piles', () => {
        // Setup: Create a valid stack to move and a valid destination
        const stackToMove: Card[] = [
            { suit: 'HEARTS', rank: '5', faceUp: true },
            { suit: 'CLUBS', rank: '4', faceUp: true },
        ];
        const destinationCard: Card = { suit: 'SPADES', rank: '6', faceUp: true };

        state.tableau[0] = [destinationCard];
        state.tableau[1] = [...stackToMove];
        
        // Simulate the move by calling the actual game logic
        // We need to ensure we have enough "movable card count" for this test. Let's empty the other freecells.
        state.freecells = [null, null, null, null]; // Allows moving up to 5 cards
        const updatedState = moveCardsLogic(state, 'tableau', 1, 0, 'tableau', 0);

        // Assertions
        expect(updatedState.tableau[1].length).toBe(0); // Source pile should be empty
        expect(updatedState.tableau[0].length).toBe(3); // Destination should have original card + stack
        expect(updatedState.tableau[0][2].rank).toBe('4');
        expect(updatedState.moves).toBe(1);
    });
});
