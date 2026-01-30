import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { createRoot } from 'react-dom/client';

import App from './App.js';

import './fonts.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const docEl = document.documentElement;
if ('fonts' in document) {
  docEl.classList.add('fonts-loading');
  try {
    await Promise.all([
      document.fonts.load('16px "EightBit Atari"'),
      document.fonts.ready,
    ]);
    docEl.classList.remove('fonts-loading');
    docEl.classList.add('fonts-loaded');
  } catch {
    docEl.classList.remove('fonts-loading');
    docEl.classList.add('fonts-failed');
  }
} else {
  docEl.classList.add('fonts-loaded');
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#235082',
      light: '#3B6A9A',
      dark: '#183A5E',
    },
    background: {
      default: '#000000',
      paper: '#235082',
    },
    text: {
      primary: '#D0D0D0',
      secondary: '#9ED9FF',
    },
  },
  typography: {
    allVariants: {
      fontFamily: '"EightBit Atari"',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        '.ui-muted': {
          opacity: 0.75,
        },
        '.ui-tip': {
          opacity: 0.6,
          fontSize: 11,
          [theme.breakpoints.up('md')]: {
            fontSize: 13,
          },
        },
        '.ui-tip-compact': {
          opacity: 0.6,
          fontSize: 'var(--ui-tip-compact-size, 10px)',
          [theme.breakpoints.up('md')]: {
            fontSize: 'var(--ui-tip-compact-size-md, 11px)',
          },
        },
        '.MuiTypography-caption.ui-tip-compact': {
          fontSize: 'var(--ui-tip-compact-size, 10px)',
          [theme.breakpoints.up('md')]: {
            fontSize: 'var(--ui-tip-compact-size-md, 11px)',
          },
        },
        '.ui-cmd-inline': {
          '--cmd-label-size-inline': '13px',
        },
        '.ui-cmd-inline-compact': {
          '--cmd-label-size-inline-compact': '12px',
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-inline-compact': '11px',
          },
        },
        '.ui-cmd-stacked': {
          '--cmd-label-size-stacked': '11px',
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-stacked': '10px',
          },
        },
        '.ui-cmd-compact': {
          '--cmd-label-size-compact': '12px',
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-compact': '11px',
          },
        },
        '.ui-nav-button': {
          [theme.breakpoints.up('md')]: {
            '--cmd-pad-y-stacked': '3px',
            '--cmd-pad-x-stacked': '8px',
            '--cmd-min-w-stacked': '56px',
            '--cmd-label-size-stacked': '13px',
            '--ui-tip-compact-size': '11px',
            '--ui-tip-compact-size-md': '11px',
          },
        },
        '.ui-panel-title': {
          fontSize: 14,
          [theme.breakpoints.up('md')]: {
            fontSize: 18,
          },
        },
        '.ui-panel-title-compact': {
          fontSize: 12,
          [theme.breakpoints.up('md')]: {
            fontSize: 13,
          },
        },
        '.ui-panel :where(.MuiTypography-root)': {
          fontSize: 13,
          [theme.breakpoints.up('md')]: {
            fontSize: 16,
          },
        },
        '.ui-panel :where(.MuiTypography-caption)': {
          fontSize: 11,
          [theme.breakpoints.up('md')]: {
            fontSize: 13,
          },
        },
      }),
    },
    MuiTypography: {
      styleOverrides: {
        caption: {
          opacity: 0.75,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.text.primary,
          color: theme.palette.primary.main,
          fontWeight: 700,
          letterSpacing: 1.2,
          '&:hover': {
            backgroundColor: theme.palette.grey[200],
          },
        }),
        outlinedPrimary: ({ theme }) => ({
          borderColor: alpha(theme.palette.primary.light, 0.5),
          color: theme.palette.text.primary,
          '&:hover': {
            borderColor: alpha(theme.palette.primary.light, 0.7),
            backgroundColor: alpha(theme.palette.primary.light, 0.5),
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.palette.text.primary,
          color: theme.palette.primary.main,
          fontFamily: '"EightBit Atari"',
          fontSize: 12,
          letterSpacing: 0.6,
          border: `1px solid ${theme.palette.primary.light}`,
        }),
        arrow: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&::before': {
            border: `1px solid ${theme.palette.primary.light}`,
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
  </ThemeProvider>
);
