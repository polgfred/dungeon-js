import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';

import { ARMOR_PRICES, Race, WEAPON_PRICES } from './dungeon/constants.js';
import type { GameSave } from './dungeon/serialization.js';
import type { Player } from './dungeon/model.js';
import { Player as PlayerModel } from './dungeon/model.js';
import { defaultRandomSource, type RandomSource } from './dungeon/rng.js';
import { deserializePlayer } from './dungeon/serialization.js';
import HomePage from './pages/HomePage.js';
import { hasSavedGame, loadSavedGame } from './storage/gameSave.js';
import Gameplay from './ui/Gameplay.js';
import SetupGame from './ui/SetupGame.js';

type RoutePath = '/' | '/setup' | '/gameplay' | '/random';

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
  const [savedGame, setSavedGame] = useState<GameSave | null>(null);
  const [saveAvailable, setSaveAvailable] = useState(false);

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
    setSaveAvailable(hasSavedGame());
  }, [route]);

  useEffect(() => {
    const handleStorage = () => setSaveAvailable(hasSavedGame());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (route === '/gameplay' && !player) {
      navigate('/setup', true);
    }
  }, [navigate, player, route]);

  useEffect(() => {
    if (route === '/random') {
      const randomPlayer = createRandomPlayer(defaultRandomSource);
      setPlayer(randomPlayer);
      setSavedGame(null);
      navigate('/gameplay');
    }
  }, [navigate, route]);

  return (
    <Box component="main" sx={(theme) => screenStyle(theme)}>
      {route === '/' && (
        <HomePage
          setupHref="#/setup"
          onBeginSetup={() => navigate('/setup')}
          hasSave={saveAvailable}
          onContinue={() => {
            const save = loadSavedGame();
            if (!save) return;
            setSavedGame(save);
            setPlayer(deserializePlayer(save.player));
            navigate('/gameplay');
          }}
        />
      )}

      {route === '/setup' && (
        <SetupGame
          onComplete={(created) => {
            setPlayer(created);
            setSavedGame(null);
            navigate('/gameplay');
          }}
          onBack={() => navigate('/')}
        />
      )}

      {route === '/gameplay' && player && (
        <Gameplay
          player={player}
          savedGame={savedGame}
          onBack={() => {
            setPlayer(null);
            setSavedGame(null);
            navigate('/');
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
  if (candidate.startsWith('/random')) {
    return '/random';
  }
  if (candidate.startsWith('/gameplay')) {
    return '/gameplay';
  }
  return '/';
}

const allocationKeys = ['ST', 'DX', 'IQ'];
type AllocationKey = (typeof allocationKeys)[number];
type AllocationState = Record<AllocationKey, number>;

function createRandomPlayer(rng: RandomSource): Player {
  const race = rng.choice([Race.HUMAN, Race.DWARF, Race.ELF, Race.HALFLING]);
  const [st, dx, iq, hp] = PlayerModel.rollBaseStats(rng, race);
  const allocations: AllocationState = { ST: 0, DX: 0, IQ: 0 };
  for (let i = 0; i < 5; i += 1) {
    const key = rng.choice(allocationKeys);
    allocations[key] += 1;
  }
  const gold = rng.randint(50, 60);

  let weaponTier = rng.randint(1, 3);
  let armorTier = rng.randint(1, 3);
  let baseCost = WEAPON_PRICES[weaponTier] + ARMOR_PRICES[armorTier];
  while (baseCost > gold) {
    if (weaponTier > 1 && armorTier > 1) {
      if (rng.random() < 0.5) {
        weaponTier -= 1;
      } else {
        armorTier -= 1;
      }
    } else if (weaponTier > 1) {
      weaponTier -= 1;
    } else if (armorTier > 1) {
      armorTier -= 1;
    } else {
      break;
    }
    baseCost = WEAPON_PRICES[weaponTier] + ARMOR_PRICES[armorTier];
  }

  const maxFlares = Math.max(0, gold - baseCost);
  const flareCount = rng.randint(0, maxFlares);

  return PlayerModel.create({
    race,
    baseStats: { ST: st, DX: dx, IQ: iq, HP: hp },
    gold,
    allocations,
    weaponTier,
    armorTier,
    flareCount,
  });
}
