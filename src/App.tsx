import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useState } from 'react';

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

  return (
    <Box component="main" sx={(theme) => screenStyle(theme)}>
      {stage === 'title' && <TitleScreen onStart={() => setStage('setup')} />}

      {stage === 'setup' && (
        <SetupGame
          onComplete={() => setStage('gameplay')}
          onBack={() => setStage('title')}
        />
      )}

      {stage === 'gameplay' && (
        <Box
          sx={{
            maxWidth: 900,
            margin: '0 auto',
            paddingTop: { xs: 6, md: 10 },
          }}
        >
          <Stack spacing={2}>
            <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
              Gameplay
            </Typography>
            <Typography sx={{ opacity: 0.75 }}>
              Terminal mode coming next.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setStage('setup')}
              color="primary"
            >
              Back to Setup
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
