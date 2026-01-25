import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";

import App from "./App.js";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#235082",
      light: "#3B6A9A",
      dark: "#183A5E",
    },
    background: {
      default: "#235082",
      paper: "#1B436E",
    },
    text: {
      primary: "#D0D0D0",
      secondary: "#B8B8FF",
    },
  },
  typography: {
    allVariants: {
      fontFamily: '"EightBit Atari"',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.text.primary,
          color: theme.palette.primary.main,
          fontWeight: 700,
          letterSpacing: 1.2,
          "&:hover": {
            backgroundColor: theme.palette.grey[200],
          },
        }),
        outlinedPrimary: ({ theme }) => ({
          borderColor: theme.palette.primary.light,
          color: theme.palette.text.primary,
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: "transparent",
          },
        }),
      },
    },
  },
});

createRoot(rootElement).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
