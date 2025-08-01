
import { test, expect, Page, TestInfo } from '@playwright/test';

type Theme = 'light' | 'dark';
type ColorMode = 'color' | 'greyscale';
type GameType = 'Solitaire' | 'Freecell' | 'Spider';

// Helper function to set the theme and color mode via localStorage
const applySettings = async (page: Page, theme: Theme, colorMode: ColorMode, gameType: GameType) => {
  await page.evaluate(({ theme, colorMode, gameType }) => {
    const settings = {
      cardStyle: theme === 'dark' ? 'domino' : 'modern',
      colorMode: colorMode,
      gameType: gameType,
    };
    localStorage.setItem('deck-of-cards-settings', JSON.stringify(settings));
  }, { theme, colorMode, gameType });
  await page.reload();
  await expect(page.getByTestId('tableau-piles')).toBeVisible();
};

// Helper function to interact with the game to get a more realistic state
const interactWithGame = async (page: Page, gameType: GameType) => {
    await page.waitForTimeout(500); // Wait for cards to settle
    if (gameType === 'Solitaire') {
      await page.getByTestId('stock-pile').click();
      await page.getByTestId('stock-pile').click();
    }
    if (gameType === 'Freecell') {
      // Correctly target the last card element in the pile for clicking.
      await page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').last().click();
      await page.getByTestId('freecell-pile-0').click();
    }
    if (gameType === 'Spider') {
      await page.getByTestId('stock-pile').click();
    }
    await page.waitForTimeout(500); // wait for moves to complete
};

const getDeviceName = (testInfo: TestInfo) => {
    switch (testInfo.project.name) {
        case 'tablet':
            return 'tablet';
        case 'mobile':
            return 'mobile';
        default:
            return 'browser';
    }
}

const games: GameType[] = ['Solitaire', 'Freecell', 'Spider'];
const themes: Theme[] = ['light', 'dark'];
const colorModes: ColorMode[] = ['color', 'greyscale'];

test.describe('App Screenshot Tests', () => {

  // Capture the main game board for each combination
  for (const game of games) {
    test.describe(`${game} Game`, () => {
      for (const theme of themes) {
        for (const colorMode of colorModes) {
          test(`${game}-${theme}-${colorMode}`, async ({ page }, testInfo) => {
            await page.goto('/');
            await applySettings(page, theme, colorMode, game);
            await interactWithGame(page, game);
            await expect(page.getByTestId('game-board')).toBeVisible();
            const device = getDeviceName(testInfo);
            const view = game.toLowerCase();
            await page.screenshot({ path: `test-results/${device}-${view}-${theme}-${colorMode}.png`, fullPage: true });
          });
        }
      }
    });
  }

  // Capture dialogs only once per theme
  test.describe('Dialogs', () => {
    for (const theme of themes) {
      const colorMode: ColorMode = 'color'; 
      const game: GameType = 'Solitaire'; 

      test(`Game Dialog-${theme}`, async ({ page }, testInfo) => {
        await page.goto('/');
        await applySettings(page, theme, colorMode, game);
        await interactWithGame(page, game);
        await page.getByTestId('game-title').click();
        await expect(page.getByTestId('game-dialog')).toBeVisible();
        await page.waitForTimeout(500); // Allow dialog animation to complete
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-gamedialog-${theme}-${colorMode}.png`, fullPage: true });
      });

      test(`Settings Dialog-${theme}`, async ({ page }, testInfo) => {
        await page.goto('/');
        await applySettings(page, theme, colorMode, game);
        await interactWithGame(page, game);
        await page.getByLabel('Settings').click();
        await expect(page.getByTestId('settings-dialog')).toBeVisible();
        await page.waitForTimeout(500); // Allow dialog animation to complete
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-settingsdialog-${theme}-${colorMode}.png`, fullPage: true });
      });
    }
  });


  test.describe('Victory Screens', () => {
    const theme: Theme = 'light';
    const colorMode: ColorMode = 'color';
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    test('Solitaire Victory', async ({ page }, testInfo) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Solitaire',
                tableau: [[], [], [], [], [], [], [{ suit: 'DIAMONDS', rank: 'K', faceUp: true }]],
                foundation: [
                    ranks.map(rank => ({ suit: 'SPADES', rank, faceUp: true })),
                    ranks.map(rank => ({ suit: 'HEARTS', rank, faceUp: true })),
                    ranks.map(rank => ({ suit: 'CLUBS', rank, faceUp: true })),
                    ranks.slice(0, 12).map(rank => ({ suit: 'DIAMONDS', rank, faceUp: true })),
                ],
                stock: [],
                waste: [],
                drawCount: 1,
                score: 100,
                moves: 50,
            }));
        });
        await page.reload();
        await expect(page.getByTestId('tableau-piles')).toBeVisible();
        await page.getByTestId('tableau-pile-6').locator('[data-testid^="card-"]').last().click();
        await page.getByTestId('foundation-pile-3').click();

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000); 
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-solitaire-victory.png`, fullPage: true });
    });

    test('Freecell Victory', async ({ page }, testInfo) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Freecell',
                tableau: [[{ suit: 'CLUBS', rank: 'K', faceUp: true }], [], [], [], [], [], [], []],
                foundation: [
                    ranks.map(rank => ({ suit: 'SPADES', rank, faceUp: true })),
                    ranks.map(rank => ({ suit: 'HEARTS', rank, faceUp: true })),
                    ranks.slice(0, 12).map(rank => ({ suit: 'CLUBS', rank, faceUp: true })),
                    ranks.map(rank => ({ suit: 'DIAMONDS', rank, faceUp: true })),
                ],
                freecells: [null, null, null, null],
                moves: 51,
                score: 0,
            }));
        });
        
        await page.reload();
        await expect(page.getByTestId('tableau-piles')).toBeVisible();
        await page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').last().click();
        await page.getByTestId('foundation-pile-2').click();

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000);
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-freecell-victory.png`, fullPage: true });
    });

    test('Spider Victory', async ({ page }, testInfo) => {
        await page.goto('/');
        await page.evaluate(() => {
            const suits = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
            
            // Create 7 completed sets (7 * 13 = 91 cards)
            const completedFoundation = Array.from({length: 7}, (_, i) => 
                ranks.map(rank => ({ suit: suits[i % 4], rank, faceUp: true }))
            );

            // Create the final set on the tableau, one move away from completion
            const finalSetRanks = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']; 
            const AlmostCompletePile = finalSetRanks.map(rank => ({ suit: 'SPADES', rank: rank, faceUp: true }));
            const AceToComplete = { suit: 'SPADES', rank: 'A', faceUp: true };

            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Spider',
                tableau: [
                    AlmostCompletePile,      // Pile with K-2 of Spades
                    [AceToComplete],         // Pile with A of Spades
                    [], [], [], [], [], [], [], []
                ],
                foundation: completedFoundation,
                stock: [], // No cards left in stock
                completedSets: 7,
                suitCount: 4, // Test with 4 suits for complexity
                moves: 99,
                score: 400,
            }));
        });

        await page.reload();
        await expect(page.getByTestId('tableau-piles')).toBeVisible();

        // Move the Ace from the almost complete pile onto the King
        await page.getByTestId('tableau-pile-1').locator('[data-testid^="card-"]').last().click();
        await page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').last().click();

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000);
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-spider-victory.png`, fullPage: true });
    });
  });
});
