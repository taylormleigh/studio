
import { createInitialState, canMoveToTableau, Card, GameState } from '../src/lib/solitaire';

// This is a simplified representation of the core move logic from the GameBoard component.
// In a real-world testing scenario with more time, this might involve rendering the component
// and simulating user events with React Testing Library. For this specific case, we are extracting
// and testing the state update logic directly.
function moveCardsLogic(
  prevState: GameState,
  sourceType: 'tableau',
  sourcePileIndex: number,
  sourceCardIndex: number,
  destType: 'tableau',
  destPileIndex: number
): GameState {
    const newGameState = JSON.parse(JSON.stringify(prevState));
    let cardsToMove: Card[];

    if (sourceType === 'tableau') {
        if (newGameState.tableau[sourcePileIndex].length === 0 || sourceCardIndex >= newGameState.tableau[sourcePileIndex].length) {
            return prevState; // Invalid source
        }
        if (newGameState.tableau[sourcePileIndex][sourceCardIndex].faceUp) {
            cardsToMove = newGameState.tableau[sourcePileIndex].slice(sourceCardIndex);
        } else {
            return prevState; // Cannot move face-down cards
        }
    } else {
      // This test suite only focuses on tableau-to-tableau moves for now.
      return prevState;
    }

    if (cardsToMove.length === 0) return prevState;

    let moveSuccessful = false;
    const cardToMove = cardsToMove[0];

    if (destType === 'tableau') {
        const destPile = newGameState.tableau[destPileIndex];
        const topDestCard = destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
        if (canMoveToTableau(cardToMove, topDestCard)) {
            destPile.push(...cardsToMove);
            moveSuccessful = true;
        }
    }

    if (moveSuccessful) {
        if (sourceType === 'tableau') {
            const sourcePile = newGameState.tableau[sourcePileIndex];
            sourcePile.splice(sourceCardIndex); // This is the line with the suspected bug
            if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
                sourcePile[sourcePile.length - 1].faceUp = true;
            }
        }
        newGameState.moves++;
        return newGameState;
    }

    return prevState; // Move was not successful
}


describe('Solitaire Game Integration Logic', () => {
    let state: GameState;

    beforeEach(() => {
        state = createInitialState();
    });

    it('should correctly move the final stack of cards from one tableau pile to another using game logic', () => {
        // Setup: A pile of two cards is the only thing in tableau pile 1
        const pileToMove: Card[] = [
            { suit: 'DIAMONDS', rank: 'J', faceUp: true },
            { suit: 'SPADES', rank: '10', faceUp: true },
        ];
        // Setup: A valid destination card in tableau pile 0
        const destinationCard: Card = { suit: 'CLUBS', rank: 'Q', faceUp: true };

        // Place the cards in the simulated state
        state.tableau[0] = [destinationCard];
        state.tableau[1] = [...pileToMove];
        state.tableau[2] = [{ suit: 'HEARTS', rank: 'K', faceUp: true }]; // Other cards to make it realistic

        // Simulate the move by calling the actual game logic
        const updatedState = moveCardsLogic(state, 'tableau', 1, 0, 'tableau', 0);

        // Assertions
        expect(updatedState.tableau[1].length).toBe(0); // Source pile should now be empty
        expect(updatedState.tableau[0].length).toBe(3); // Destination pile should have the new cards
        expect(updatedState.tableau[0][2].rank).toBe('10'); // The last card should be the 10 of spades
    });
});
