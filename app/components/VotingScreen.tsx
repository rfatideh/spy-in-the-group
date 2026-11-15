'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayerSession, leaveRoom } from '../utils/playerSession';
import HostRestartButton from './HostRestartButton';
import styles from './VotingScreen.module.css';

interface VotingScreenProps {
  roomId: string;
}

export default function VotingScreen({ roomId }: VotingScreenProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getPlayerSession();
    if (!session) {
      router.push('/');
      return;
    }

    setPlayerName(session.playerName);
    fetchRoomData();
  }, [router]);

  // Moving on to results once everyone votes is handled by the page's
  // useGamePhaseRedirect.

  const handleLeave = async () => {
    await leaveRoom();
    router.push('/');
  };

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();

        // Check if voting is already complete
        if (data.room.gamePhase === 'results') {
          router.push('/results');
          return;
        }

        setPlayers(data.room.players);

        // Check if current player already voted
        const session = getPlayerSession();
        if (session && data.room.votes) {
          const alreadyVoted = data.room.votes.some(
            (v: any) => v.voterName === session.playerName
          );
          setHasVoted(alreadyVoted);
        }

        setLoading(false);
      }
    } catch (err) {
      setError('Failed to load voting data');
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedPlayer) {
      setError('Please select a player to vote for');
      return;
    }

    try {
      setVoting(true);
      setError(null);

      const response = await fetch(`/api/rooms/${roomId}/cast-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: playerName,
          votedForName: selectedPlayer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cast vote');
      }

      const data = await response.json();
      setHasVoted(true);

      if (data.allVoted) {
        // All players voted, redirect to results
        router.push('/results');
      }
    } catch (err) {
      setError('Failed to cast vote. Please try again.');
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  const otherPlayers = players.filter(p => p !== playerName);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Vote for the Spy</h1>
        <p className={styles.subtitle}>Who do you think is the spy?</p>

        {!hasVoted ? (
          <>
            <div className={styles.playersList}>
              {otherPlayers.map((player) => (
                <button
                  key={player}
                  onClick={() => setSelectedPlayer(player)}
                  className={`${styles.playerButton} ${
                    selectedPlayer === player ? styles.selected : ''
                  }`}
                  data-testid={`vote-player-${player}`}
                >
                  <span className={styles.playerIcon}>
                    {selectedPlayer === player ? '✓' : '👤'}
                  </span>
                  <span className={styles.playerNameText}>{player}</span>
                </button>
              ))}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              onClick={handleVote}
              disabled={!selectedPlayer || voting}
              className={styles.voteButton}
            >
              {voting ? 'Submitting Vote...' : 'Submit Vote'}
            </button>

            <p className={styles.hint}>
              You cannot vote for yourself. Choose carefully!
            </p>
          </>
        ) : (
          <div className={styles.waitingSection}>
            <div className={styles.checkmark}>✓</div>
            <h2 className={styles.votedTitle}>Vote Submitted!</h2>
            <p className={styles.votedText}>
              You voted for: <strong>{selectedPlayer}</strong>
            </p>
            <div className={styles.waitingInfo}>
              <div className={styles.spinner}></div>
              <p>Waiting for other players to vote...</p>
            </div>
          </div>
        )}

        <HostRestartButton />

        <button onClick={handleLeave} className={styles.leaveButton}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
