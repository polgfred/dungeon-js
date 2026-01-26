import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useState } from 'react';

import type { Player } from './dungeon/model.js';
import Gameplay from './ui/Gameplay.js';
import SetupGame from './ui/SetupGame.js';
import TitleScreen from './ui/TitleScreen.js';

type AppStage = 'title' | 'setup' | 'gameplay';

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
  const [stage, setStage] = useState<AppStage>('title');
  const [player, setPlayer] = useState<Player | null>(null);

  return (
    <Box component="main" sx={(theme) => screenStyle(theme)}>
      {stage === 'title' && <TitleScreen onStart={() => setStage('setup')} />}

      {stage === 'setup' && (
        <SetupGame
          onComplete={(created) => {
            setPlayer(created);
            setStage('gameplay');
          }}
          onBack={() => setStage('title')}
        />
      )}

      {stage === 'gameplay' && player && (
        <Gameplay
          player={player}
          onBack={() => {
            setPlayer(null);
            setStage('setup');
          }}
        />
      )}
    </Box>
  );
}
