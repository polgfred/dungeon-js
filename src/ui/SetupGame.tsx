import {
  Box,
  Button,
  ButtonBase,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, lighten, type Theme } from '@mui/material/styles';
import { useMemo, useState } from 'react';

import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
} from '../dungeon/constants.js';
import { Player } from '../dungeon/model.js';
import { defaultRandomSource } from '../dungeon/rng.js';

type AllocationKey = 'ST' | 'DX' | 'IQ';
type AllocationState = Record<AllocationKey, number>;
type SetupStage = 'race' | 'allocate' | 'shop' | 'ready';
type Stats = {
  ST: number;
  DX: number;
  IQ: number;
  HP: number;
};

const raceOptions = [
  { value: Race.HUMAN, label: 'Human', tagline: 'Balanced and adaptable.' },
  { value: Race.DWARF, label: 'Dwarf', tagline: 'Stout and resilient.' },
  { value: Race.ELF, label: 'Elf', tagline: 'Quick and arcane.' },
  { value: Race.HALFLING, label: 'Halfling', tagline: 'Steady and lucky.' },
];

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

function RaceStage({
  race,
  baseStats,
  onSelect,
  onBack,
  onConfirm,
}: {
  race: Race | null;
  baseStats: Stats | null;
  onSelect: (value: Race) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ letterSpacing: 2 }}>
        Choose Thy Race
      </Typography>
      <Typography sx={{ opacity: 0.75 }}>
        Base player stats are rolled on selection. Confirm to lock in stats.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        {raceOptions.map((option) => {
          const active = race === option.value;
          return (
            <ButtonBase
              key={option.label}
              onClick={() => onSelect(option.value)}
              sx={(theme) => ({
                borderRadius: 2,
                padding: 2,
                textAlign: 'left',
                border: active
                  ? `1px solid ${alpha(theme.palette.primary.light, 0.9)}`
                  : `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
                background: active
                  ? alpha(theme.palette.primary.light, 0.35)
                  : alpha(theme.palette.primary.dark, 0.35),
                boxShadow: active
                  ? `0 0 20px ${alpha(theme.palette.primary.light, 0.45)}`
                  : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              })}
            >
              <Typography sx={{ letterSpacing: 2 }}>{option.label}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {option.tagline}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
      {baseStats && (
        <Box
          sx={(theme) => ({
            border: `1px solid ${alpha(theme.palette.primary.light, 0.45)}`,
            borderRadius: 2,
            padding: 2,
            background: alpha(theme.palette.primary.dark, 0.35),
          })}
        >
          <Typography sx={{ opacity: 0.7 }}>Rolled Stats</Typography>
          <Typography sx={{ letterSpacing: 1.5 }}>
            ST {baseStats.ST} · DX {baseStats.DX} · IQ {baseStats.IQ} · HP{' '}
            {baseStats.HP}
          </Typography>
        </Box>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onBack} color="primary">
          Back
        </Button>
        <Button
          variant="contained"
          disabled={!race || !baseStats}
          onClick={onConfirm}
          color="primary"
        >
          Confirm Race
        </Button>
      </Stack>
    </Stack>
  );
}

function AllocationStage({
  baseStats,
  allocations,
  remainingPoints,
  onAdjust,
  onBack,
  onConfirm,
}: {
  baseStats: Stats | null;
  allocations: AllocationState;
  remainingPoints: number;
  onAdjust: (key: AllocationKey, delta: number) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ letterSpacing: 2 }}>
        Allocate Points
      </Typography>
      <Typography sx={{ opacity: 0.75 }}>
        Distribute five points across strength, dexterity, and intelligence.
        Attributes are capped at 18.
      </Typography>
      <Stack spacing={2}>
        {(['ST', 'DX', 'IQ'] as AllocationKey[]).map((key) => {
          const baseValue = baseStats ? baseStats[key] : 0;
          const totalValue = Math.min(18, baseValue + allocations[key]);
          return (
            <Box
              key={key}
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto',
                gap: 2,
                alignItems: 'center',
                border: `1px solid ${alpha(theme.palette.primary.light, 0.45)}`,
                borderRadius: 2,
                padding: 2,
                background: alpha(theme.palette.primary.dark, 0.35),
              })}
            >
              <Typography sx={{ letterSpacing: 2 }}>{key}</Typography>
              <Box>
                <Typography sx={{ opacity: 0.7 }}>
                  Base {baseValue} + {allocations[key]} → {totalValue}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => onAdjust(key, -1)}
                  disabled={allocations[key] === 0}
                  color="primary"
                >
                  -
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => onAdjust(key, 1)}
                  disabled={remainingPoints <= 0 || totalValue >= 18}
                  color="primary"
                >
                  +
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>
      <Typography sx={{ color: 'text.secondary' }}>
        Points remaining: {remainingPoints}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onBack} color="primary">
          Back
        </Button>
        <Button
          variant="contained"
          disabled={remainingPoints !== 0}
          onClick={onConfirm}
          color="primary"
        >
          Lock Stats
        </Button>
      </Stack>
    </Stack>
  );
}

function ShopStage({
  weaponTier,
  armorTier,
  flares,
  maxFlares,
  setupError,
  onWeaponTier,
  onArmorTier,
  onFlaresChange,
  onBack,
  onConfirm,
  disableConfirm,
}: {
  weaponTier: number;
  armorTier: number;
  flares: number;
  maxFlares: number;
  setupError: string | null;
  onWeaponTier: (value: number) => void;
  onArmorTier: (value: number) => void;
  onFlaresChange: (value: number) => void;
  onBack: () => void;
  onConfirm: () => void;
  disableConfirm: boolean;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ letterSpacing: 2 }}>
        Arm Thyself
      </Typography>
      <Typography sx={{ opacity: 0.75 }}>
        Now, you must purchase a weapon, armor, and flares. Any remaining gold
        is kept.
      </Typography>
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
            Weapon Tier
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={weaponTier}
            onChange={(_, value) => value && onWeaponTier(value)}
            sx={(theme) => ({
              '& .MuiToggleButton-root': {
                borderColor: alpha(theme.palette.primary.light, 0.5),
                color: theme.palette.text.primary,
                textTransform: 'none',
                letterSpacing: 1,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                background: alpha(theme.palette.primary.light, 0.7),
                color: theme.palette.text.primary,
              },
            })}
          >
            {[1, 2, 3].map((tier) => (
              <ToggleButton key={tier} value={tier}>
                {WEAPON_NAMES[tier]} - {WEAPON_PRICES[tier]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
            Armor Tier
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={armorTier}
            onChange={(_, value) => value && onArmorTier(value)}
            sx={(theme) => ({
              '& .MuiToggleButton-root': {
                borderColor: alpha(theme.palette.primary.light, 0.5),
                color: theme.palette.text.primary,
                textTransform: 'none',
                letterSpacing: 1,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                background: alpha(theme.palette.primary.light, 0.6),
                color: theme.palette.text.primary,
              },
            })}
          >
            {[1, 2, 3].map((tier) => (
              <ToggleButton key={tier} value={tier}>
                {ARMOR_NAMES[tier]} - {ARMOR_PRICES[tier]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography sx={{ marginBottom: 1, letterSpacing: 1 }}>
            Flares
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              onClick={() => onFlaresChange(Math.max(0, flares - 1))}
              disabled={flares === 0}
              color="primary"
            >
              -
            </Button>
            <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
              {flares}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => onFlaresChange(Math.min(maxFlares, flares + 1))}
              disabled={flares >= maxFlares}
              color="primary"
            >
              +
            </Button>
            <Typography sx={{ opacity: 0.65 }}>Max {maxFlares}</Typography>
          </Stack>
        </Box>
      </Stack>
      {setupError && (
        <Typography sx={{ color: 'error.light' }}>{setupError}</Typography>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onBack} color="primary">
          Back
        </Button>
        <Button
          variant="contained"
          disabled={disableConfirm}
          onClick={onConfirm}
          color="primary"
        >
          Finalize Inventory
        </Button>
      </Stack>
    </Stack>
  );
}

function ReadyStage({
  player,
  onReset,
  onComplete,
}: {
  player: Player;
  onReset: () => void;
  onComplete: () => void;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ letterSpacing: 2 }}>
        Setup Complete
      </Typography>
      <Typography sx={{ opacity: 0.75 }}>
        Brave adventurer, thy gear outfits thee well! But victory remains to be
        seen.
      </Typography>
      <Stack spacing={1}>
        <Typography>Weapon: {player.weaponName}</Typography>
        <Typography>Armor: {player.armorName}</Typography>
        <Typography>Flares: {player.flares}</Typography>
        <Typography>Gold Remaining: {player.gold}</Typography>
      </Stack>
      <Typography sx={{ opacity: 0.75 }}>THE DUNGEON AWAITS YOU...</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onReset} color="primary">
          Reset Setup
        </Button>
        <Button variant="contained" onClick={onComplete} color="primary">
          Enter Dungeon
        </Button>
      </Stack>
    </Stack>
  );
}

function StatusReadout({
  race,
  derivedStats,
  gold,
  weaponTier,
  armorTier,
  flares,
  totalCost,
}: {
  race: Race | null;
  derivedStats: Stats | null;
  gold: number | null;
  weaponTier: number;
  armorTier: number;
  flares: number;
  totalCost: number;
}) {
  return (
    <Stack spacing={2}>
      <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
        Player Readout
      </Typography>
      <Stack spacing={1}>
        <Typography sx={{ opacity: 0.7 }}>Race</Typography>
        <Typography>
          {race
            ? raceOptions.find((option) => option.value === race)?.label
            : 'Unassigned'}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography sx={{ opacity: 0.7 }}>Stats</Typography>
        <Typography>ST {derivedStats ? derivedStats.ST : '--'}</Typography>
        <Typography>DX {derivedStats ? derivedStats.DX : '--'}</Typography>
        <Typography>IQ {derivedStats ? derivedStats.IQ : '--'}</Typography>
        <Typography>HP {derivedStats ? derivedStats.HP : '--'}</Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography sx={{ opacity: 0.7 }}>Supplies</Typography>
        <Typography>Gold: {gold !== null ? gold : '--'}</Typography>
        <Typography>Weapon: {WEAPON_NAMES[weaponTier]}</Typography>
        <Typography>Armor: {ARMOR_NAMES[armorTier]}</Typography>
        <Typography>Flares: {flares}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Remaining: {gold !== null ? gold - totalCost : '--'}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function SetupGame({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const rng = useMemo(() => defaultRandomSource, []);
  const [stage, setStage] = useState<SetupStage>('race');
  const [race, setRace] = useState<Race | null>(null);
  const [baseStats, setBaseStats] = useState<Stats | null>(null);
  const [allocations, setAllocations] = useState<AllocationState>({
    ST: 0,
    DX: 0,
    IQ: 0,
  });
  const [gold, setGold] = useState<number | null>(null);
  const [weaponTier, setWeaponTier] = useState(1);
  const [armorTier, setArmorTier] = useState(1);
  const [flares, setFlares] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const totalAllocated = allocations.ST + allocations.DX + allocations.IQ;
  const remainingPoints = 5 - totalAllocated;
  const weaponCost = WEAPON_PRICES[weaponTier];
  const armorCost = ARMOR_PRICES[armorTier];
  const goldPool = gold ?? 0;
  const totalCost = weaponCost + armorCost + flares;
  const maxFlares = Math.max(0, goldPool - weaponCost - armorCost);

  const derivedStats = baseStats
    ? {
        ST: Math.min(18, baseStats.ST + allocations.ST),
        DX: Math.min(18, baseStats.DX + allocations.DX),
        IQ: Math.min(18, baseStats.IQ + allocations.IQ),
        HP: baseStats.HP,
      }
    : null;

  const handleRaceSelect = (value: Race) => {
    setRace(value);
    const [st, dx, iq, hp] = Player.rollBaseStats(rng, value);
    setBaseStats({ ST: st, DX: dx, IQ: iq, HP: hp });
    setAllocations({ ST: 0, DX: 0, IQ: 0 });
    setSetupError(null);
  };

  const handleAdjust = (key: AllocationKey, delta: number) => {
    setAllocations((prev) => {
      const next = Math.max(0, prev[key] + delta);
      return { ...prev, [key]: next };
    });
  };

  const handleAdvanceToShop = () => {
    if (remainingPoints === 0) {
      setStage('shop');
      if (gold === null) {
        setGold(rng.randint(50, 60));
      }
    }
  };

  const handleFinish = () => {
    if (!race || !baseStats || gold === null) return;
    setSetupError(null);
    try {
      const created = Player.create({
        race,
        baseStats,
        gold,
        allocations,
        weaponTier,
        armorTier,
        flareCount: flares,
      });
      setPlayer(created);
      setStage('ready');
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Setup failed.');
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gap: 3,
        containerType: 'inline-size',
        '@keyframes boot': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'boot 650ms ease-out',
      }}
    >
      <Box
        sx={(theme) => ({
          ...panelStyle(theme),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingY: 1.5,
        })}
      >
        <Typography sx={{ letterSpacing: 3, textTransform: 'uppercase' }}>
          Player Setup
        </Typography>
        <Typography sx={{ color: 'text.secondary', opacity: 0.8 }}>
          {stage.toUpperCase()}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr',
          '@container (min-width: 1280px)': {
            gridTemplateColumns: '2fr 1fr',
          },
        }}
      >
        <Box sx={(theme) => panelStyle(theme)}>
          {stage === 'race' && (
            <RaceStage
              race={race}
              baseStats={baseStats}
              onSelect={handleRaceSelect}
              onBack={onBack}
              onConfirm={() => setStage('allocate')}
            />
          )}

          {stage === 'allocate' && (
            <AllocationStage
              baseStats={baseStats}
              allocations={allocations}
              remainingPoints={remainingPoints}
              onAdjust={handleAdjust}
              onBack={() => setStage('race')}
              onConfirm={handleAdvanceToShop}
            />
          )}

          {stage === 'shop' && (
            <ShopStage
              weaponTier={weaponTier}
              armorTier={armorTier}
              flares={flares}
              maxFlares={maxFlares}
              setupError={setupError}
              onWeaponTier={setWeaponTier}
              onArmorTier={setArmorTier}
              onFlaresChange={setFlares}
              onBack={() => setStage('allocate')}
              onConfirm={handleFinish}
              disableConfirm={gold === null || totalCost > gold}
            />
          )}

          {stage === 'ready' && player && (
            <ReadyStage
              player={player}
              onReset={() => setStage('race')}
              onComplete={onComplete}
            />
          )}
        </Box>

        <Box sx={(theme) => panelStyle(theme)}>
          <StatusReadout
            race={race}
            derivedStats={derivedStats}
            gold={gold}
            weaponTier={weaponTier}
            armorTier={armorTier}
            flares={flares}
            totalCost={totalCost}
          />
        </Box>
      </Box>
    </Box>
  );
}
