import { Box, Button, Stack, Typography } from '@mui/material';

import titleImage from '../assets/DofDTitle.png';

type TitleScreenProps = {
  onStart?: () => void;
  hasSave?: boolean;
  onContinue?: () => void;
};

export default function TitleScreen({
  onStart,
  hasSave = false,
  onContinue,
}: TitleScreenProps) {
  const handleStart = () => {
    if (!onStart) return;
    onStart();
  };

  const handleContinue = () => {
    if (!onContinue) return;
    onContinue();
  };

  return (
    <Box
      sx={{
        maxWidth: 1100,
        margin: '0 auto',
        paddingTop: { xs: 2, md: 10 },
        display: 'grid',
        gap: { xs: 4, md: 5 },
        gridTemplateColumns: { xs: '1fr', md: '.85fr 1.15fr' },
        alignItems: 'center',
      }}
    >
      <Box
        sx={(theme) => ({
          width: '100%',
          gridColumn: { xs: 'auto', md: 2 },
          gridRow: { md: 1 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.primary.light}`,
          background: 'rgba(0, 0, 0, 0.22)',
          boxShadow: `0 0 24px ${theme.palette.primary.dark}`,
        })}
      >
        <Box
          component="img"
          src={titleImage}
          alt="Dungeon of Doom title screen"
          sx={{
            display: 'block',
            width: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
          }}
        />
      </Box>
      <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
        <Typography sx={{ opacity: 0.75, maxWidth: 560 }}>
          Now, brave adventurer: prepare to choose thy race, arm thyself, and
          descend into the dungeon.
        </Typography>
        <Stack
          direction="column"
          spacing={2}
          alignItems="center"
          sx={{ width: '100%' }}
        >
          <Button
            variant="contained"
            onClick={handleStart}
            color="primary"
            sx={{ width: '75%', maxWidth: 320 }}
          >
            Begin Setup
          </Button>
          {hasSave && (
            <Button
              variant="outlined"
              onClick={handleContinue}
              color="primary"
              sx={{ width: '75%', maxWidth: 320 }}
            >
              Continue Quest
            </Button>
          )}
        </Stack>
      </Stack>
      <Stack
        spacing={2}
        sx={(theme) => ({
          gridColumn: { xs: 'auto', md: '1 / -1' },
          borderRadius: 2,
          padding: 3,
          border: `1px solid ${theme.palette.primary.light}`,
          background: 'rgba(0, 0, 0, 0.36)',
          marginTop: 4,
          maxWidth: 1100,
          opacity: 0.6,
          '& .MuiTypography-root': {
            fontSize: { xs: 13, md: 16 },
          },
        })}
      >
        <Typography>
          Dungeon of Doom was created by Fred Polgardy and Eric Phillips between
          Christmas 1987 and New Years 1988. It was written in BASIC on an Atari
          800XL.
        </Typography>
        <Typography>
          The original game engine was ported to Python and TypeScript in
          conversation with OpenAI's GPT-5.2-Codex.
        </Typography>
        <Typography>
          I have attempted to preserve the language and visual style of the game
          while updating to a more modern experience. Enjoy!
        </Typography>
      </Stack>
    </Box>
  );
}
