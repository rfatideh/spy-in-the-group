'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from './contexts/GameContext';
import SetupScreen from './components/SetupScreen';
import RevealScreen from './components/RevealScreen';
import TimerScreen from './components/TimerScreen';
import EndGameScreen from './components/EndGameScreen';
import { resolveSessionRoute } from './utils/gameRoute';

export default function Home() {
  const { phase } = useGame();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Anyone (host or player) with a multi-device session goes straight back to
  // their room's current phase; otherwise show the local game flow.
  useEffect(() => {
    resolveSessionRoute()
      .then((route) => {
        if (route) {
          router.replace(route);
        } else {
          setIsChecking(false);
        }
      })
      .catch(() => setIsChecking(false));
  }, [router]);

  // Show nothing while checking the session
  if (isChecking) {
    return null;
  }

  // Otherwise, show normal game flow
  return (
    <>
      {phase === 'setup' && <SetupScreen />}
      {phase === 'reveal' && <RevealScreen />}
      {phase === 'playing' && <TimerScreen />}
      {(phase === 'voting' || phase === 'results') && <EndGameScreen />}
    </>
  );
}
