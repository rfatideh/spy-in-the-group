interface PlayerSession {
  playerId: string;
  playerName: string;
  roomId: string;
  isHost: boolean;
}

const SESSION_KEY = 'spy-game-session';

export function savePlayerSession(session: PlayerSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getPlayerSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

// Leaves the lobby: frees the player's name on the server, then clears the
// local session. Failures are ignored so the player can always leave.
export async function leaveRoom(): Promise<void> {
  const session = getPlayerSession();
  if (session && !session.isHost) {
    try {
      await fetch(`/api/rooms/${session.roomId}/leave`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({playerName: session.playerName}),
      });
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  }
  clearPlayerSession();
}

export function isHost(): boolean {
  const session = getPlayerSession();
  return session?.isHost ?? false;
}

export function isPlayer(): boolean {
  const session = getPlayerSession();
  return session !== null && !session.isHost;
}
