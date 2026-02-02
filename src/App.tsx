import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';

import type { GameSave } from './dungeon/serialization.js';
import type { Player } from './dungeon/model.js';
import { deserializePlayer } from './dungeon/serialization.js';
import { hasSavedGame, loadSavedGame } from './ui/gameSave.js';
import Gameplay from './ui/Gameplay.js';
import SetupGame from './ui/SetupGame.js';
import TitleScreen from './ui/TitleScreen.js';

type View = 'home' | 'setup' | 'gameplay';

const screenStyle = (theme: Theme) => ({
  minHeight: '100vh',
  color: theme.palette.text.primary,
  background: `linear-gradient(135deg, ${alpha(
    theme.palette.background.default,
    0.96
  )}, ${alpha(theme.palette.primary.dark, 0.92)} 60%, ${alpha(
    theme.palette.background.default,
    0.96
  )})`,
  backgroundImage: `linear-gradient(135deg, ${alpha(
    theme.palette.background.default,
    0.96
  )}, ${alpha(theme.palette.primary.dark, 0.92)} 60%, ${alpha(
    theme.palette.background.default,
    0.96
  )}), repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.22) 0px,
    rgba(0,0,0,0.22) 1px,
    rgba(0,0,0,0) 1px,
    rgba(0,0,0,0) 3px
  )`,
  backgroundBlendMode: 'screen',
  position: 'relative',
  overflow: 'hidden',
  padding: { xs: 2, md: 4 },
});

export default function App() {
  const [view, setView] = useState<View>('home');
  const [player, setPlayer] = useState<Player | null>(null);
  const [savedGame, setSavedGame] = useState<GameSave | null>(null);
  const [saveAvailable, setSaveAvailable] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

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
    <Box component="main" sx={(theme) => screenStyle(theme)}>
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
    </Box>
  );
}
