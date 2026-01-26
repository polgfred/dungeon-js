import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';

import type { Player } from './dungeon/model.js';
import HomePage from './pages/HomePage.js';
import Gameplay from './ui/Gameplay.js';
import SetupGame from './ui/SetupGame.js';

type RoutePath = '/' | '/setup' | '/gameplay';

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
  const [route, setRoute] = useState<RoutePath>(() => getRoutePath());
  const [player, setPlayer] = useState<Player | null>(null);

  const navigate = useCallback((path: RoutePath, replace = false) => {
    const target = `#${path}`;
    if (replace) {
      window.history.replaceState(null, '', target);
    } else {
      window.history.pushState(null, '', target);
    }
    setRoute(path);
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setRoute(getRoutePath());
    };
    window.addEventListener('popstate', handleChange);
    window.addEventListener('hashchange', handleChange);
    return () => {
      window.removeEventListener('popstate', handleChange);
      window.removeEventListener('hashchange', handleChange);
    };
  }, []);

  useEffect(() => {
    if (route === '/gameplay' && !player) {
      navigate('/setup', true);
    }
  }, [navigate, player, route]);

  return (
    <Box component="main" sx={(theme) => screenStyle(theme)}>
      {route === '/' && (
        <HomePage
          setupHref="#/setup"
          onBeginSetup={() => navigate('/setup')}
        />
      )}

      {route === '/setup' && (
        <SetupGame
          onComplete={(created) => {
            setPlayer(created);
            navigate('/gameplay');
          }}
          onBack={() => navigate('/')}
        />
      )}

      {route === '/gameplay' && player && (
        <Gameplay
          player={player}
          onBack={() => {
            setPlayer(null);
            navigate('/setup');
          }}
        />
      )}
    </Box>
  );
}

function getRoutePath(): RoutePath {
  const hashPath = window.location.hash.replace(/^#/, '');
  const candidate = hashPath || window.location.pathname;
  if (candidate.startsWith('/setup')) {
    return '/setup';
  }
  if (candidate.startsWith('/gameplay')) {
    return '/gameplay';
  }
  return '/';
}
