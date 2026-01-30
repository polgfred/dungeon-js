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
        '.ui-tip-compact.MuiTypography-caption': {
          fontSize: 'var(--ui-tip-compact-size, 10px)',
          [theme.breakpoints.up('md')]: {
            fontSize: 'var(--ui-tip-compact-size-md, 11px)',
          },
        },
        '.ui-tip-compact-nav': {
          opacity: 0.6,
          fontSize: 'var(--cmd-nav-tip-size, 10px)',
          [theme.breakpoints.up('md')]: {
            fontSize: 'var(--cmd-nav-tip-size-md, 11px)',
          },
        },
        '.ui-tip-compact-nav.MuiTypography-caption': {
          fontSize: 'var(--cmd-nav-tip-size, 10px)',
          [theme.breakpoints.up('md')]: {
            fontSize: 'var(--cmd-nav-tip-size-md, 11px)',
          },
        },
        '.ui-cmd-inline.MuiButton-root': {
          '--cmd-label-size-inline': '13px',
          minWidth: 0,
          padding: '8px 16px',
          letterSpacing: 0.6,
        },
        '.ui-cmd-inline-compact.MuiButton-root': {
          '--cmd-label-size-inline-compact': '12px',
          minWidth: 0,
          padding: '4.8px 11.2px',
          letterSpacing: 0.5,
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-inline-compact': '11px',
          },
        },
        '.ui-cmd-stacked.MuiButton-root': {
          '--cmd-label-size-stacked': '11px',
          minWidth: '72px',
          padding: '4.8px 12px',
          letterSpacing: 0.8,
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-stacked': '10px',
          },
        },
        '.ui-cmd-compact.MuiButton-root': {
          '--cmd-label-size-compact': '12px',
          minWidth: '44px',
          padding: '4.8px 9.6px',
          letterSpacing: 1.2,
          [theme.breakpoints.up('md')]: {
            '--cmd-label-size-compact': '11px',
          },
        },
        '.ui-nav-button.MuiButton-root': {
          '--cmd-nav-min-w': '48px',
          '--cmd-nav-label-size': '13px',
          '--cmd-nav-key-size': '12px',
          '--cmd-nav-tip-size': '10px',
          '--cmd-nav-tip-size-md': '11px',
          minWidth: '48px',
        },
        '.ui-nav-button.ui-cmd-stacked.MuiButton-root': {
          [theme.breakpoints.up('md')]: {
            padding: '3px 8px',
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
