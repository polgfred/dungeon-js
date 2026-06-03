import { useCallback, useEffect, useState } from 'react';

import styles from './App.module.css';
import type { GameSave } from '../dungeon/serialization.js';
import type { Player } from '../dungeon/model.js';
import { deserializePlayer } from '../dungeon/serialization.js';
import { hasSavedGame, loadSavedGame } from './gameSave.js';
import Gameplay from './Gameplay.js';
import SetupGame from './SetupGame.js';
import TitleScreen from './TitleScreen.js';
import { useAttractMode } from './useAttractMode.js';

type View = 'home' | 'setup' | 'gameplay';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [player, setPlayer] = useState<Player | null>(null);
  const [savedGame, setSavedGame] = useState<GameSave | null>(null);
  const [saveAvailable, setSaveAvailable] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  useAttractMode();

  const navigate = useCallback((nextView: View) => {
    setView(nextView);
  }, []);

  useEffect(() => {
    setSaveAvailable(hasSavedGame());
  }, [view]);

  useEffect(() => {
    const handleStorage = () => setSaveAvailable(hasSavedGame());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (view === 'gameplay' && !player) {
      navigate('setup');
    }
  }, [navigate, player, view]);

  return (
    <main className={styles.screen}>
      {view === 'home' && (
        <TitleScreen
          onStart={() => {
            setContinueError(null);
            navigate('setup');
          }}
          hasSave={saveAvailable}
          continueError={continueError}
          onContinue={() => {
            try {
              const save = loadSavedGame();
              if (!save) return;
              setContinueError(null);
              setSavedGame(save);
              setPlayer(deserializePlayer(save.player));
              navigate('gameplay');
            } catch (error) {
              const details =
                error instanceof Error && error.message
                  ? ` (${error.message})`
                  : '';
              setContinueError(`Unable to restore saved game.${details}`);
            }
          }}
        />
      )}

      {view === 'setup' && (
        <SetupGame
          onComplete={(created) => {
            setPlayer(created);
            setSavedGame(null);
            setContinueError(null);
            navigate('gameplay');
          }}
          onBack={() => navigate('home')}
        />
      )}

      {view === 'gameplay' && player && (
        <Gameplay
          player={player}
          savedGame={savedGame}
          onBack={() => {
            setPlayer(null);
            setSavedGame(null);
            setContinueError(null);
            navigate('home');
          }}
          onSetup={() => {
            setPlayer(null);
            setSavedGame(null);
            setContinueError(null);
            navigate('setup');
          }}
        />
      )}
    </main>
  );
}
