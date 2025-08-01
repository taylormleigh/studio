
import { test, expect, Page } from '@playwright/test';

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

const games: GameType[] = ['Solitaire', 'Freecell', 'Spider'];
const themes: Theme[] = ['light', 'dark'];
const colorModes: ColorMode[] = ['color', 'greyscale'];

test.describe('App Screenshot Tests', () => {

  for (const game of games) {
    test.describe(`${game} Game`, () => {
      for (const theme of themes) {
        for (const colorMode of colorModes) {
          const testTitlePrefix = `${game}-${theme}-${colorMode}`;

          test(`${testTitlePrefix}: Main Game Screen`, async ({ page }) => {
            await page.goto('/');
            await applySettings(page, theme, colorMode, game);
            await interactWithGame(page, game);
            await expect(page.getByTestId('game-board')).toBeVisible();
            await page.screenshot({ path: `test-results/screenshot-${testTitlePrefix}-main.png`, fullPage: true });
          });

          test(`${testTitlePrefix}: Game Dialog`, async ({ page }) => {
            await page.goto('/');
            await applySettings(page, theme, colorMode, game);
            await interactWithGame(page, game);
            await page.getByTestId('game-title').click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.waitForTimeout(500); // Allow dialog animation to complete
            await page.screenshot({ path: `test-results/screenshot-${testTitlePrefix}-game-dialog.png`, fullPage: true });
          });

          test(`${testTitlePrefix}: Settings Dialog`, async ({ page }) => {
            await page.goto('/');
            await applySettings(page, theme, colorMode, game);
            await interactWithGame(page, game);
            await page.getByLabel('Settings').click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.waitForTimeout(500); // Allow dialog animation to complete
            await page.screenshot({ path: `test-results/screenshot-${testTitlePrefix}-settings-dialog.png`, fullPage: true });
          });
        }
      }
    });
  }

  test('Victory Dialog Screen (Solitaire)', async ({ page }) => {
    // This test is complex to automate reliably, so we'll skip it for now.
    // Winning a game would require implementing game-solving logic.
    test.skip(true, 'Victory screen test is skipped for now.');
  });
});
