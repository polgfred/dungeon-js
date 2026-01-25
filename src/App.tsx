import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useState } from "react";

import SetupGame from "./ui/SetupGame.js";

type AppStage = "title" | "setup" | "gameplay";

const screenStyle = (theme: Theme) => ({
  minHeight: "100vh",
  color: theme.palette.text.primary,
  background: `linear-gradient(135deg, ${alpha(
    theme.palette.primary.light,
    0.92,
  )}, ${alpha(theme.palette.primary.main, 0.95)} 60%, ${alpha(
    theme.palette.primary.light,
    0.92,
  )})`,
  backgroundImage: `linear-gradient(135deg, ${alpha(
    theme.palette.primary.light,
    0.92,
  )}, ${alpha(theme.palette.primary.main, 0.95)} 60%, ${alpha(
    theme.palette.primary.light,
    0.92,
  )}), repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.18) 0px,
    rgba(0,0,0,0.18) 1px,
    rgba(0,0,0,0) 1px,
    rgba(0,0,0,0) 3px
  )`,
  backgroundBlendMode: "screen",
  position: "relative",
  overflow: "hidden",
  padding: { xs: 2, md: 4 },
});

export default function App() {
  const [stage, setStage] = useState<AppStage>("title");

  return (
    <Box component="main" sx={(theme) => screenStyle(theme)}>
      {stage === "title" && (
        <Box
          sx={{
            maxWidth: 900,
            margin: "0 auto",
            paddingTop: { xs: 8, md: 12 },
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
              Initialize your lineage, tune your stats, and stock your kit
              before descending.
            </Typography>
            <Button
              variant="contained"
              onClick={() => setStage("setup")}
              color="primary"
            >
              Begin Setup
            </Button>
          </Stack>
        </Box>
      )}

      {stage === "setup" && (
        <SetupGame
          onComplete={() => setStage("gameplay")}
          onBack={() => setStage("title")}
        />
      )}

      {stage === "gameplay" && (
        <Box
          sx={{
            maxWidth: 900,
            margin: "0 auto",
            paddingTop: { xs: 6, md: 10 },
          }}
        >
          <Stack spacing={2}>
            <Typography sx={{ letterSpacing: 2, textTransform: "uppercase" }}>
              Gameplay
            </Typography>
            <Typography sx={{ opacity: 0.75 }}>
              Terminal mode coming next.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setStage("setup")}
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
