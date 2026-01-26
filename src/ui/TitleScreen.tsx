import { Box, Button, Stack, Typography } from "@mui/material";

export default function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <Box
      sx={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingTop: { xs: 6, md: 10 },
        display: "grid",
        gap: 4,
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
        alignItems: "center",
      }}
    >
      <Stack spacing={3} alignItems="flex-start">
        <Typography sx={{ letterSpacing: 4, textTransform: "uppercase" }}>
          Dungeon OS
        </Typography>
        <Typography variant="h3" sx={{ letterSpacing: 2 }}>
          Cold Boot Sequence
        </Typography>
        <Typography sx={{ opacity: 0.75, maxWidth: 560 }}>
          Initialize your lineage, tune your stats, and stock your kit before
          descending.
        </Typography>
        <Button variant="contained" onClick={onStart} color="primary">
          Begin Setup
        </Button>
      </Stack>
      <Box
        sx={(theme) => ({
          borderRadius: 2,
          padding: 2,
          border: `1px solid ${theme.palette.primary.light}`,
          background: "rgba(0, 0, 0, 0.2)",
          boxShadow: `0 0 20px ${theme.palette.primary.dark}`,
        })}
      >
        <Box
          component="img"
          src="/DofDTitle.png"
          alt="Dungeon of Doom title screen"
          sx={{
            display: "block",
            width: "100%",
            height: "auto",
            imageRendering: "pixelated",
          }}
        />
      </Box>
    </Box>
  );
}
