
import { test, expect, Page, TestInfo } from '@playwright/test';

type Theme = 'light' | 'dark';
type ColorMode = 'color' | 'greyscale';
type GameType = 'Solitaire' | 'Freecell' | 'Spider';
type Suit = 'SPADES' | 'HEARTS' | 'CLUBS' | 'DIAMONDS';

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

    test('Solitaire Victory', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.evaluate(() => {
            const getNewCompletedFoundation = () => {
                const allRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

                const getCompletedSet = (suit: Suit) => allRanks.map(rank => ({ suit: suit, rank: rank, faceUp: true }));
        
                var spades = getCompletedSet('SPADES');
                var hearts = getCompletedSet('HEARTS');
                var clubs = getCompletedSet('CLUBS');
                var diamonds = getCompletedSet('DIAMONDS');

                return [ spades, hearts, clubs, diamonds ];
            };

            var foundationPiles = getNewCompletedFoundation();
            var finalCard = foundationPiles[0].pop();
            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Solitaire',
                tableau: [[], [], [], [], [], [], [finalCard]],
                foundation: foundationPiles,
                stock: [],
                waste: [],
                drawCount: 1,
                score: 100,
                moves: 50,
            }));
        });
        await expect(page.getByTestId('tableau-piles')).toBeVisible();
        await page.getByTestId('tableau-pile-6').locator('[data-testid^="card-"]').last().click();
        await page.waitForTimeout(500); //wait for dialog to fully load

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000); 
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-solitaire-victory.png`, fullPage: true });
    });

    test('Freecell Victory', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.evaluate(() => {
            var foundationPiles = getNewCompletedFoundation();
            var finalCard = foundationPiles[0].pop();
            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Freecell',
                tableau: [[finalCard], [], [], [], [], [], [], []],
                foundation: foundationPiles,
                freecells: [null, null, null, null],
                moves: 51,
                score: 0,
            }));
        });
        await expect(page.getByTestId('tableau-piles')).toBeVisible();
        await page.getByTestId('tableau-pile-0').locator('[data-testid^="card-"]').last().click();

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000);
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-freecell-victory.png`, fullPage: true });
    });

    test('Spider Victory', async ({ page }, testInfo) => {
      await page.goto('/');
      await page.evaluate(() => {
            var oneCompletedSet = getNewCompletedFoundation();
            var completedFoundation = [ ...oneCompletedSet, ...oneCompletedSet ];
            var finalCard = completedFoundation[0].pop();
            localStorage.setItem('deck-of-cards-debug-state', JSON.stringify({
                gameType: 'Spider',
                tableau: [ 
                    [], [finalCard], [], [], [], [], [], [], []
                ],
                foundation: completedFoundation,
                stock: [],
                completedSets: 7,
                suitCount: 4, // Test with 4 suits for complexity
                moves: 99,
                score: 400,
            }));
        });
        await expect(page.getByTestId('tableau-piles')).toBeVisible();

        await page.getByTestId('tableau-pile-1').locator('[data-testid^="card-"]').last().click();
        await page.waitForTimeout(500); //wait for dialog to fully load

        await expect(page.getByTestId('victory-dialog')).toBeVisible();
        await page.waitForTimeout(1000);
        const device = getDeviceName(testInfo);
        await page.screenshot({ path: `test-results/${device}-spider-victory.png`, fullPage: true });
    });
  });
});
