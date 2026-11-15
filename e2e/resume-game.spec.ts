import {expect, test} from '@playwright/test';
import {setUpMultiDeviceRoom, waitForPolling} from './test-helpers';
import {POLLING_TIMEOUT} from './fixtures';

test.describe('Resuming a multi-device game after closing the browser', () => {
  test('host reopening the home page returns to the lobby', async ({browser}) => {
    const {contexts, hostPage, roomId} = await setUpMultiDeviceRoom(browser);
    try {
      await hostPage.close();
      const reopened = await contexts[0].newPage();
      await reopened.goto('/');

      await expect(reopened).toHaveURL(new RegExp(`/join/${roomId}$`), {timeout: POLLING_TIMEOUT});
      await expect(reopened.getByRole('button', {name: /start game/i})).toBeVisible();
    } finally {
      await Promise.all(contexts.map(c => c.close()));
    }
  });

  test('players who missed several phases land on the current phase', async ({browser}) => {
    const {contexts, hostPage, player1Page, player2Page} = await setUpMultiDeviceRoom(browser);
    try {
      await waitForPolling(hostPage, 1);
      await hostPage.getByRole('button', {name: /start game/i}).click();

      // Player2 confirms, then closes the browser on the role screen. The game
      // moves on through the timer into voting without them.
      for (const page of [player2Page, hostPage, player1Page]) {
        await expect(page.getByText('Your Role')).toBeVisible({timeout: POLLING_TIMEOUT});
        await page.getByRole('button', {name: /i got it/i}).click();
        if (page === player2Page) {
          await expect(page.getByText(/waiting for other players to confirm/i)).toBeVisible();
          await page.close();
        }
      }
      await expect(hostPage.getByRole('button', {name: /start voting/i})).toBeVisible({timeout: POLLING_TIMEOUT});
      await hostPage.getByRole('button', {name: /start voting/i}).click();
      await expect(hostPage.getByRole('heading', {name: /vote for the spy/i})).toBeVisible({timeout: POLLING_TIMEOUT});

      // The host closes their browser too.
      await hostPage.close();

      // Both reopen the site at the home page and land on voting.
      for (const context of [contexts[0], contexts[2]]) {
        const reopened = await context.newPage();
        await reopened.goto('/');
        await expect(reopened).toHaveURL(/\/vote$/, {timeout: POLLING_TIMEOUT});
        await expect(reopened.getByRole('heading', {name: /vote for the spy/i})).toBeVisible();
      }

      // Opening a stale page from an earlier phase also redirects to voting.
      await player1Page.goto('/role-reveal');
      await expect(player1Page).toHaveURL(/\/vote$/, {timeout: POLLING_TIMEOUT});

      // Leaving mid-game ends the session: the home page no longer redirects.
      await player1Page.getByRole('button', {name: /leave game/i}).click();
      await expect(player1Page.getByRole('button', {name: /multi device/i})).toBeVisible({timeout: POLLING_TIMEOUT});
      await player1Page.goto('/');
      await expect(player1Page.getByRole('button', {name: /multi device/i})).toBeVisible({timeout: POLLING_TIMEOUT});
    } finally {
      await Promise.all(contexts.map(c => c.close()));
    }
  });
});
