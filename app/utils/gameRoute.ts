'use client';

import {useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Room} from '../types/game';
import {clearPlayerSession, getPlayerSession} from './playerSession';

const POLL_INTERVAL_MS = 2000;

// The page that shows a multi-device room's current phase.
export function getRouteForRoom(room: Pick<Room, 'id' | 'gamePhase'>): string {
  switch (room.gamePhase) {
    case 'revealing':
      return '/role-reveal';
    case 'timer':
      return '/timer';
    case 'voting':
      return '/vote';
    case 'results':
      return '/results';
    default:
      return `/join/${room.id}`;
  }
}

// Resolves where the saved session belongs right now. Returns null, and clears
// the session, when there is no session or its room/player no longer exists.
// Throws on network or server errors so callers keep the session and retry.
export async function resolveSessionRoute(): Promise<string | null> {
  const session = getPlayerSession();
  if (!session) return null;

  const response = await fetch(`/api/rooms/${session.roomId}`);
  if (response.status === 404) {
    clearPlayerSession();
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch room: ${response.status}`);
  }

  const {room} = await response.json();
  if (!room.players.includes(session.playerName)) {
    clearPlayerSession();
    return null;
  }
  return getRouteForRoom(room);
}

// Keeps a multi-device page in sync with the room: on load and every poll, it
// moves the player to the page for the room's current phase. This lets players
// come back after closing the browser, even if they missed several phases.
export function useGamePhaseRedirect(enabled = true) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const sync = async () => {
      try {
        const route = await resolveSessionRoute();
        if (cancelled) return;
        if (route === null) {
          router.replace('/');
        } else if (route !== pathname) {
          router.replace(route);
        }
      } catch (err) {
        console.error('Failed to sync game phase:', err);
      }
    };

    sync();
    const interval = setInterval(sync, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, pathname, router]);
}
