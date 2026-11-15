import {expect, Page, test} from '@playwright/test';
import {setUpMultiDeviceRoom, waitForPolling} from './test-helpers';
import {POLLING_TIMEOUT} from './fixtures';

// Starts the game and has everyone confirm their role, ending on the timer.
async function playToTimer(hostPage: Page, players: Page[]) {
  await waitForPolling(hostPage, 1);
  await hostPage.getByRole('button', {name: /start game/i}).click();
  for (const page of [hostPage, ...players]) {
    await expect(page.getByText('Your Role')).toBeVisible({timeout: POLLING_TIMEOUT});
    await page.getByRole('button', {name: /i got it/i}).click();
  }
  await expect(hostPage.getByRole('button', {name: /start voting/i})).toBeVisible({timeout: POLLING_TIMEOUT});
}

async function expectEveryoneInLobby(roomId: string, hostPage: Page, players: Page[]) {
  for (const page of [hostPage, ...players]) {
    await expect(page).toHaveURL(new RegExp(`/join/${roomId}$`), {timeout: POLLING_TIMEOUT});
    await expect(page.getByText('Game Lobby')).toBeVisible();
  }
  await expect(hostPage.getByRole('button', {name: /start game/i})).toBeVisible();
  for (const page of players) {
    await expect(page.getByText(/waiting for host to start/i)).toBeVisible();
  }
}

test.describe('Host restarting a multi-device game mid-game', () => {
  test('host can restart from the timer and start a new round', async ({browser}) => {
    const {contexts, hostPage, player1Page, player2Page, roomId} = await setUpMultiDeviceRoom(browser);
    const players = [player1Page, player2Page];
    try {
      await playToTimer(hostPage, players);

      // Only the host gets the restart option
      await expect(hostPage.getByRole('button', {name: 'Restart Game'})).toBeVisible();
      for (const page of players) {
        await expect(page).toHaveURL(/\/timer$/, {timeout: POLLING_TIMEOUT});
        await expect(page.getByRole('button', {name: 'Restart Game'})).toHaveCount(0);
      }

      // Cancelling keeps the game going
      await hostPage.getByRole('button', {name: 'Restart Game'}).click();
      await hostPage.getByRole('button', {name: 'Cancel'}).click();
      await expect(hostPage).toHaveURL(/\/timer$/);
      await expect(hostPage.getByRole('button', {name: /start voting/i})).toBeVisible();

      // Confirming sends everyone back to the lobby
      await hostPage.getByRole('button', {name: 'Restart Game'}).click();
      await hostPage.getByRole('button', {name: /yes, restart/i}).click();
      await expectEveryoneInLobby(roomId, hostPage, players);

      // And a new round can start
      await hostPage.getByRole('button', {name: /start game/i}).click();
      for (const page of [hostPage, ...players]) {
        await expect(page.getByText('Your Role')).toBeVisible({timeout: POLLING_TIMEOUT});
      }
    } finally {
      await Promise.all(contexts.map(c => c.close()));
    }
  });

  test('host can restart during voting', async ({browser}) => {
    const {contexts, hostPage, player1Page, player2Page, roomId} = await setUpMultiDeviceRoom(browser);
    const players = [player1Page, player2Page];
    try {
      await playToTimer(hostPage, players);
      await hostPage.getByRole('button', {name: /start voting/i}).click();
      for (const page of [hostPage, ...players]) {
        await expect(page.getByRole('heading', {name: /vote for the spy/i})).toBeVisible({timeout: POLLING_TIMEOUT});
      }

      // One player has voted when the host restarts
      await player1Page.getByTestId('vote-player-Host').click();
      await player1Page.getByRole('button', {name: /submit vote/i}).click();
      await expect(player1Page.getByText(/vote submitted/i)).toBeVisible();

      await expect(player2Page.getByRole('button', {name: 'Restart Game'})).toHaveCount(0);
      await hostPage.getByRole('button', {name: 'Restart Game'}).click();
      await hostPage.getByRole('button', {name: /yes, restart/i}).click();
      await expectEveryoneInLobby(roomId, hostPage, players);
    } finally {
      await Promise.all(contexts.map(c => c.close()));
    }
  });
});
