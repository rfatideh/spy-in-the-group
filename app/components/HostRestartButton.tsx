'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {getPlayerSession, restartGame} from '../utils/playerSession';
import styles from './HostRestartButton.module.css';

// Lets the host abandon the current round mid-game and send everyone back to
// the lobby. Renders nothing for other players.
export default function HostRestartButton() {
  const router = useRouter();
  const [isHost, setIsHost] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHost(getPlayerSession()?.isHost ?? false);
  }, []);

  if (!isHost) return null;

  const handleRestart = async () => {
    setRestarting(true);
    setError(null);
    try {
      router.push(await restartGame());
    } catch (err) {
      console.error('Failed to restart game:', err);
      setError('Failed to restart the game. Please try again.');
      setRestarting(false);
    }
  };

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={styles.restartButton}>
        Restart Game
      </button>
    );
  }

  return (
    <div className={styles.confirmPanel} role="alertdialog" aria-labelledby="restart-confirm-text">
      <p id="restart-confirm-text" className={styles.confirmText}>
        Restart the game? This round ends for everyone and all players go back to the lobby.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.confirmActions}>
        <button
          onClick={() => setConfirming(false)}
          disabled={restarting}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          onClick={handleRestart}
          disabled={restarting}
          className={styles.confirmButton}
        >
          {restarting ? 'Restarting...' : 'Yes, restart'}
        </button>
      </div>
    </div>
  );
}
