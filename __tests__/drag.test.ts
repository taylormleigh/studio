
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameType, Card, Suit } from '@/lib/solitaire';

// Helper to set up a specific game state via localStorage
const setupGame = async (page: Page, state: any) => {
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.setItem('deck-of-cards-debug-state', JSON.stringify(state));
  }, state);
  await page.reload();
  await expect(page.getByTestId('tableau-piles')).toBeVisible();
};

test.describe('Drag and Drop Tests', () => {

  test('Solitaire: should move a card from waste to a valid tableau pile', async ({ page }) => {
    await setupGame(page, {
      gameType: 'Solitaire',
      waste: [{ suit: 'HEARTS', rank: 'Q', faceUp: true }],
      tableau: [[], [], [], [], [{ suit: 'SPADES', rank: 'K', faceUp: true }]],
      stock: [],
      foundation: [],
    });

    const sourceCard = page.getByTestId('card-HEARTS-Q');
    const targetPile = page.getByTestId('tableau-pile-4');

    await sourceCard.dragTo(targetPile);

    // Verify the card is now in the target pile
    await expect(targetPile.locator('[data-testid="card-HEARTS-Q"]')).toBeVisible();
    // Verify the waste pile is now empty
    await expect(page.getByTestId('card-waste-empty')).toBeVisible();
  });

  test('Solitaire: should move a stack from one tableau to another', async ({ page }) => {
    await setupGame(page, {
        gameType: 'Solitaire',
        tableau: [
            [{ suit: 'DIAMONDS', rank: '8', faceUp: true }, { suit: 'CLUBS', rank: '7', faceUp: true }],
            [{ suit: 'HEARTS', rank: '9', faceUp: true }],
            [], [], [], [], []
        ],
        stock: [], waste: [], foundation: [],
    });

    const sourceCard = page.getByTestId('card-CLUBS-7'); // Dragging the 7 of Clubs
    const targetCard = page.getByTestId('card-HEARTS-9');

    await sourceCard.dragTo(targetCard);

    await expect(page.getByTestId('tableau-pile-1').locator('[data-testid="card-DIAMONDS-8"]')).toBeVisible();
    await expect(page.getByTestId('tableau-pile-1').locator('[data-testid="card-CLUBS-7"]')).toBeVisible();
  });


  test('Freecell: should move a card from tableau to an empty freecell', async ({ page }) => {
    await setupGame(page, {
      gameType: 'Freecell',
      tableau: [[{ suit: 'SPADES', rank: 'A', faceUp: true }], [], [], [], [], [], [], []],
      freecells: [null, null, null, null],
      foundation: [],
    });

    const sourceCard = page.getByTestId('card-SPADES-A');
    const targetPile = page.getByTestId('freecell-pile-0');

    await sourceCard.dragTo(targetPile);

    await expect(targetPile.locator('[data-testid="card-SPADES-A"]')).toBeVisible();
    await expect(page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]')).toHaveCount(0);
  });
  
  test('Freecell: should move a valid stack between tableau piles', async ({ page }) => {
    await setupGame(page, {
      gameType: 'Freecell',
      tableau: [
        [{ suit: 'HEARTS', rank: '6', faceUp: true }, { suit: 'CLUBS', rank: '5', faceUp: true }],
        [{ suit: 'DIAMONDS', rank: '7', faceUp: true }],
        [], [], [], [], [], []
      ],
      freecells: [null, null, null, null],
      foundation: [],
    });

    const sourceCard = page.getByTestId('card-CLUBS-5');
    const targetPile = page.getByTestId('tableau-pile-1');

    await sourceCard.dragTo(targetPile);
    
    // Check that the 6 of Hearts is still on top of the first pile.
    await expect(page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').first()).toHaveAttribute('data-testid', 'card-HEARTS-6');
    await expect(page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]')).toHaveCount(1);
    
    // Check that the second pile now contains the 7 of Diamonds and the 5 of Clubs.
    await expect(page.getByTestId('tableau-pile-1').locator('[data-testid="card-DIAMONDS-7"]')).toBeVisible();
    await expect(page.getByTestId('tableau-pile-1').locator('[data-testid="card-CLUBS-5"]')).toBeVisible();
  });


  test('Spider: should move a valid run of cards to another tableau pile', async ({ page }) => {
    await setupGame(page, {
      gameType: 'Spider',
      suitCount: 1,
      tableau: [
        [{ suit: 'SPADES', rank: 'K', faceUp: true }, { suit: 'SPADES', rank: 'Q', faceUp: true }],
        [{ suit: 'SPADES', rank: 'A', faceUp: true }],
        [], [], [], [], [], [], [], []
      ],
      foundation: [], stock: [],
    });

    const sourceCard = page.getByTestId('card-SPADES-Q'); // Drag the Queen
    const targetPile = page.getByTestId('tableau-pile-1'); // Drop on the Ace

    await sourceCard.dragTo(targetPile);
    
    await expect(page.getByTestId('tableau-pile-1').locator('[data-testid="card-SPADES-Q"]')).toBeHidden();
    await expect(page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').last()).toHaveAttribute('data-testid', 'card-SPADES-K');
  });

});

    