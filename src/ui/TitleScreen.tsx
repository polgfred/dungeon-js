import { Box, Button, Stack, Typography } from '@mui/material';

export default function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <Box
      sx={{
        maxWidth: 1100,
        margin: '0 auto',
        paddingTop: { xs: 6, md: 10 },
        display: 'grid',
        gap: { xs: 4, md: 5 },
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
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
          src="/DofDTitle.png"
          alt="Dungeon of Doom title screen"
          sx={{
            display: 'block',
            width: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
          }}
        />
      </Box>
      <Stack spacing={3} alignItems="flex-start">
        <Typography sx={{ opacity: 0.75, maxWidth: 560 }}>
          Now, brave adventurer: prepare to choose thy race, arm thyself, and
          descend into the dungeon.
        </Typography>
        <Button variant="contained" onClick={onStart} color="primary">
          Begin Setup
        </Button>
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
        })}
      >
        <Typography>
          Dungeon of Doom was created by Fred Polgardy and Eric Phillips between
          Christmas 1987 and New Years 1988. It was written in BASIC on an Atari
          800XL.
        </Typography>
        <Typography>
          The core game engine and UX were ported to Python and TypeScript with
          the help of OpenAI's GPT-5.2-Codex.
        </Typography>
        <Typography>
          I have attempted to preserve the language and visual style of the game
          while updating to a more modern experience. Enjoy!
        </Typography>
      </Stack>
    </Box>
  );
}
