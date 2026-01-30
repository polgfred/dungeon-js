import {
  Box,
  Button,
  ButtonBase,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import helpHtmlContent from '../assets/help.html?raw';
import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
} from '../dungeon/constants.js';
import { Player } from '../dungeon/model.js';
import { defaultRandomSource } from '../dungeon/rng.js';
import { CommandButton, type Command } from './CommandButton.js';

type AllocationKey = 'ST' | 'DX' | 'IQ';
type AllocationState = Record<AllocationKey, number>;
type SetupStage = 'race' | 'allocate' | 'shop' | 'ready';
type Stats = {
  ST: number;
  DX: number;
  IQ: number;
  HP: number;
};

function normalizeCommandKey(event: KeyboardEvent): string | null {
  if (event.key === 'Enter') return 'Enter';
  if (event.key === 'Escape') return 'Esc';
  if (event.key.length !== 1) return null;
  const upper = event.key.toUpperCase();
  return event.shiftKey ? `Shift+${upper}` : upper;
}

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

function MobileHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <Box
      sx={(theme) => ({
        ...panelStyle(theme),
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: 1.5,
          paddingY: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography sx={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Help
        </Typography>
        <Typography
          aria-label="Close help"
          onClick={onClose}
          sx={{ cursor: 'pointer', opacity: 0.7 }}
        >
          Close
        </Typography>
      </Box>
      <Box
        sx={{
          padding: 1.5,
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.5,
          '& *': {
            fontSize: 'inherit',
          },
          '& h1': { marginTop: 0, opacity: 0.75 },
          '& h2, & h3': { opacity: 0.7 },
          '& h1, & h2, & h3': {
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          },
          '& li': { marginBottom: 0.5 },
          '& ul li::marker': { content: '"- "' },
        }}
        dangerouslySetInnerHTML={{ __html: helpHtmlContent }}
      />
    </Box>
  );
}

function SetupCommandPanel({
  title,
  commands,
  onTrigger,
  titleVariant = 'default',
}: {
  title: string;
  commands: Command[];
  onTrigger: (command: Command) => void;
  titleVariant?: 'default' | 'compact';
}) {
  const titleSx =
    titleVariant === 'compact'
      ? {
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          opacity: 0.6,
          fontSize: 12,
        }
      : { letterSpacing: 2, textTransform: 'uppercase' };
  return (
    <Box
      sx={(theme) => ({
        ...panelStyle(theme),
        paddingY: { xs: 1.5, md: 2 },
      })}
    >
      <Stack spacing={2}>
        <Typography sx={titleSx}>{title}</Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
          }}
        >
          {commands.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onTrigger={onTrigger}
            />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

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
      <Typography
        variant="h5"
        sx={{ letterSpacing: 2, fontSize: { xs: 18, md: 'inherit' } }}
      >
        Choose Thy Race
      </Typography>
      <Typography sx={{ opacity: 0.75, fontSize: { xs: 13, md: 16 } }}>
        Base player stats are rolled on selection. Confirm to lock in your
        numbers.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1, md: 2 },
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr' },
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
                padding: { xs: 1.5, md: 2 },
                textAlign: 'center',
                border: active
                  ? `1px solid ${alpha(theme.palette.primary.light, 0.9)}`
                  : `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
                background: active
                  ? alpha(theme.palette.primary.light, 0.5)
                  : alpha(theme.palette.primary.dark, 0.35),
                boxShadow: active
                  ? `0 0 20px ${alpha(theme.palette.primary.light, 0.45)}`
                  : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 0.5, md: 1 },
              })}
            >
              <Typography sx={{ letterSpacing: 2 }}>{option.label}</Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.7,
                  textAlign: 'center',
                  width: '100%',
                  display: { xs: 'none', md: 'block' },
                }}
              >
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Stack spacing={3}>
      <Typography
        variant="h5"
        sx={{ letterSpacing: 2, fontSize: { xs: 18, md: 'inherit' } }}
      >
        Allocate Points
      </Typography>
      <Typography sx={{ opacity: 0.75, fontSize: { xs: 13, md: 16 } }}>
        Distribute five additional points across strength, dexterity, and
        intelligence. Attributes are capped at 18.
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
                  {isMobile
                    ? totalValue
                    : `Base ${baseValue} + ${allocations[key]} → ${totalValue}`}
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
  goldRemaining,
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
  goldRemaining: number | null;
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
      <Typography
        variant="h5"
        sx={{ letterSpacing: 2, fontSize: { xs: 18, md: 'inherit' } }}
      >
        Arm Thyself
      </Typography>
      <Typography sx={{ opacity: 0.8, color: 'text.secondary' }}>
        Gold remaining: {goldRemaining !== null ? goldRemaining : '--'}
      </Typography>
      <Typography sx={{ opacity: 0.75, fontSize: { xs: 13, md: 16 } }}>
        Now, you must purchase a weapon, armor, and flares. Any remaining gold
        is kept for future exploits.
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
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              width: { xs: '100%', md: 'auto' },
              '& .MuiToggleButton-root': {
                borderColor: alpha(theme.palette.primary.light, 0.5),
                color: theme.palette.text.primary,
                textTransform: 'none',
                letterSpacing: 1,
                width: { xs: '100%', md: 'auto' },
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
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              width: { xs: '100%', md: 'auto' },
              '& .MuiToggleButton-root': {
                borderColor: alpha(theme.palette.primary.light, 0.5),
                color: theme.palette.text.primary,
                textTransform: 'none',
                letterSpacing: 1,
                width: { xs: '100%', md: 'auto' },
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
          Finalize Gear
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
  onComplete: (player: Player) => void;
}) {
  return (
    <Stack spacing={3}>
      <Typography
        variant="h5"
        sx={{ letterSpacing: 2, fontSize: { xs: 18, md: 'inherit' } }}
      >
        Setup Complete
      </Typography>
      <Typography sx={{ opacity: 0.75, fontSize: { xs: 13, md: 16 } }}>
        Brave adventurer, thy gear outfits thee well! But alas, this quest is
        not for the faint of heart. Are you ready to enter the dungeon?
      </Typography>
      <Stack spacing={1}>
        <Typography>Weapon: {player.weaponName}</Typography>
        <Typography>Armor: {player.armorName}</Typography>
        <Typography>Flares: {player.flares}</Typography>
        <Typography>Gold Remaining: {player.gold}</Typography>
      </Stack>
      <Typography sx={{ opacity: 0.75, fontSize: { xs: 13, md: 16 } }}>
        THE DUNGEON AWAITS YOU...
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button variant="outlined" onClick={onReset} color="primary">
          Reset Setup
        </Button>
        <Button
          variant="contained"
          onClick={() => onComplete(player)}
          color="primary"
        >
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
      <Stack spacing={0.5}>
        <Typography sx={{ opacity: 0.7 }}>Race</Typography>
        <Typography>
          {race
            ? raceOptions.find((option) => option.value === race)?.label
            : 'Unassigned'}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography sx={{ opacity: 0.7 }}>Stats</Typography>
        <Typography>ST {derivedStats ? derivedStats.ST : '--'}</Typography>
        <Typography>DX {derivedStats ? derivedStats.DX : '--'}</Typography>
        <Typography>IQ {derivedStats ? derivedStats.IQ : '--'}</Typography>
        <Typography>HP {derivedStats ? derivedStats.HP : '--'}</Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography sx={{ opacity: 0.7 }}>Inventory</Typography>
        <Typography>Gold: {gold !== null ? gold : '--'}</Typography>
        <Typography>Weapon: {WEAPON_NAMES[weaponTier]}</Typography>
        <Typography>Armor: {ARMOR_NAMES[armorTier]}</Typography>
        <Typography>Flares: {flares}</Typography>
      </Stack>
      {gold !== null && (
        <Stack spacing={0.5}>
          <Typography sx={{ color: 'text.secondary' }}>
            Remaining: {gold !== null ? gold - totalCost : '--'}
          </Typography>
        </Stack>
      )}
      <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 11 }}>
        Tip: press the letter keys shown on each command. Use the Shift
        {'\uE01C'} key to decrease values.
      </Typography>
    </Stack>
  );
}

function SetupGameMobile({
  mobileView,
  onSelectView,
  setupPanel,
  statsPanel,
}: {
  mobileView: 'setup' | 'stats' | 'help';
  onSelectView: (view: 'setup' | 'stats' | 'help') => void;
  setupPanel: ReactNode;
  statsPanel: ReactNode;
}) {
  return (
    <>
      <Stack spacing={2} sx={{ minHeight: 'calc(100dvh - 96px)' }}>
        {mobileView === 'setup' ? (
          setupPanel
        ) : mobileView === 'stats' ? (
          statsPanel
        ) : (
          <Stack spacing={2} sx={{ minHeight: 0 }}>
            <MobileHelpPanel onClose={() => onSelectView('setup')} />
          </Stack>
        )}
      </Stack>
      <Box
        sx={(theme) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: 1,
          borderTop: `1px solid ${alpha(theme.palette.primary.light, 0.4)}`,
          background: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(8px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1,
        })}
      >
        <Button
          variant={mobileView === 'setup' ? 'contained' : 'outlined'}
          onClick={() => onSelectView('setup')}
        >
          Setup
        </Button>
        <Button
          variant={mobileView === 'stats' ? 'contained' : 'outlined'}
          onClick={() => onSelectView('stats')}
        >
          Stats
        </Button>
        <Button
          variant={mobileView === 'help' ? 'contained' : 'outlined'}
          onClick={() => onSelectView('help')}
        >
          Help
        </Button>
      </Box>
    </>
  );
}

function SetupGameDesktop({
  setupPanel,
  statsPanel,
}: {
  setupPanel: ReactNode;
  statsPanel: ReactNode;
}) {
  return (
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
      {setupPanel}
      {statsPanel}
    </Box>
  );
}

export default function SetupGame({
  onComplete,
  onBack,
}: {
  onComplete: (player: Player) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const [mobileView, setMobileView] = useState<'setup' | 'stats' | 'help'>(
    'setup'
  );

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

  const commandList = useMemo(() => {
    if (stage === 'race') {
      return [
        { id: 'race-human', key: 'H', label: 'Human', disabled: false },
        { id: 'race-dwarf', key: 'D', label: 'Dwarf', disabled: false },
        { id: 'race-elf', key: 'E', label: 'Elf', disabled: false },
        { id: 'race-halfling', key: 'L', label: 'Halfling', disabled: false },
        {
          id: 'race-confirm',
          key: 'Enter',
          label: 'Confirm',
          disabled: !race || !baseStats,
        },
        { id: 'race-back', key: 'Esc', label: 'Back', disabled: false },
      ];
    }

    if (stage === 'allocate') {
      const canAdjust = Boolean(baseStats);
      const stTotal = baseStats ? baseStats.ST + allocations.ST : 0;
      const dxTotal = baseStats ? baseStats.DX + allocations.DX : 0;
      const iqTotal = baseStats ? baseStats.IQ + allocations.IQ : 0;
      return [
        {
          id: 'alloc-st-plus',
          key: 'S',
          label: 'ST +',
          disabled: !canAdjust || remainingPoints <= 0 || stTotal >= 18,
        },
        {
          id: 'alloc-st-minus',
          key: 'Shift+S',
          label: 'ST -',
          disabled: !canAdjust || allocations.ST === 0,
        },
        {
          id: 'alloc-dx-plus',
          key: 'D',
          label: 'DX +',
          disabled: !canAdjust || remainingPoints <= 0 || dxTotal >= 18,
        },
        {
          id: 'alloc-dx-minus',
          key: 'Shift+D',
          label: 'DX -',
          disabled: !canAdjust || allocations.DX === 0,
        },
        {
          id: 'alloc-iq-plus',
          key: 'I',
          label: 'IQ +',
          disabled: !canAdjust || remainingPoints <= 0 || iqTotal >= 18,
        },
        {
          id: 'alloc-iq-minus',
          key: 'Shift+I',
          label: 'IQ -',
          disabled: !canAdjust || allocations.IQ === 0,
        },
        {
          id: 'alloc-confirm',
          key: 'Enter',
          label: 'Confirm',
          disabled: remainingPoints !== 0,
        },
        { id: 'alloc-back', key: 'Esc', label: 'Back', disabled: false },
      ];
    }

    if (stage === 'shop') {
      const confirmDisabled = gold === null || totalCost > gold;
      return [
        {
          id: 'shop-weapon-plus',
          key: 'W',
          label: 'Weapon +',
          disabled: weaponTier >= 3,
        },
        {
          id: 'shop-weapon-minus',
          key: 'Shift+W',
          label: 'Weapon -',
          disabled: weaponTier <= 1,
        },
        {
          id: 'shop-armor-plus',
          key: 'A',
          label: 'Armor +',
          disabled: armorTier >= 3,
        },
        {
          id: 'shop-armor-minus',
          key: 'Shift+A',
          label: 'Armor -',
          disabled: armorTier <= 1,
        },
        {
          id: 'shop-flares-plus',
          key: 'F',
          label: 'Flares +',
          disabled: flares >= maxFlares,
        },
        {
          id: 'shop-flares-minus',
          key: 'Shift+F',
          label: 'Flares -',
          disabled: flares <= 0,
        },
        {
          id: 'shop-confirm',
          key: 'Enter',
          label: 'Finalize',
          disabled: confirmDisabled,
        },
        { id: 'shop-back', key: 'Esc', label: 'Back', disabled: false },
      ];
    }

    return [
      { id: 'ready-reset', key: 'R', label: 'Reset', disabled: false },
      { id: 'ready-enter', key: 'Enter', label: 'Enter', disabled: false },
    ];
  }, [
    stage,
    race,
    baseStats,
    allocations,
    remainingPoints,
    weaponTier,
    armorTier,
    flares,
    maxFlares,
    gold,
    totalCost,
  ]);

  const commandMap = useMemo(() => {
    const map = new Map<string, Command>();
    commandList
      .filter((command) => !command.disabled)
      .forEach((command) => map.set(command.key, command));
    return map;
  }, [commandList]);

  const handleTrigger = useCallback(
    (command: Command) => {
      if (stage === 'race') {
        switch (command.id) {
          case 'race-human':
            handleRaceSelect(Race.HUMAN);
            return;
          case 'race-dwarf':
            handleRaceSelect(Race.DWARF);
            return;
          case 'race-elf':
            handleRaceSelect(Race.ELF);
            return;
          case 'race-halfling':
            handleRaceSelect(Race.HALFLING);
            return;
          case 'race-confirm':
            if (race && baseStats) setStage('allocate');
            return;
          case 'race-back':
            onBack();
            return;
        }
      }

      if (stage === 'allocate') {
        switch (command.id) {
          case 'alloc-st-plus':
            handleAdjust('ST', 1);
            return;
          case 'alloc-st-minus':
            handleAdjust('ST', -1);
            return;
          case 'alloc-dx-plus':
            handleAdjust('DX', 1);
            return;
          case 'alloc-dx-minus':
            handleAdjust('DX', -1);
            return;
          case 'alloc-iq-plus':
            handleAdjust('IQ', 1);
            return;
          case 'alloc-iq-minus':
            handleAdjust('IQ', -1);
            return;
          case 'alloc-confirm':
            handleAdvanceToShop();
            return;
          case 'alloc-back':
            setStage('race');
            return;
        }
      }

      if (stage === 'shop') {
        switch (command.id) {
          case 'shop-weapon-plus':
            setWeaponTier((prev) => Math.min(3, prev + 1));
            return;
          case 'shop-weapon-minus':
            setWeaponTier((prev) => Math.max(1, prev - 1));
            return;
          case 'shop-armor-plus':
            setArmorTier((prev) => Math.min(3, prev + 1));
            return;
          case 'shop-armor-minus':
            setArmorTier((prev) => Math.max(1, prev - 1));
            return;
          case 'shop-flares-plus':
            setFlares((prev) => Math.min(maxFlares, prev + 1));
            return;
          case 'shop-flares-minus':
            setFlares((prev) => Math.max(0, prev - 1));
            return;
          case 'shop-confirm':
            handleFinish();
            return;
          case 'shop-back':
            setStage('allocate');
            return;
        }
      }

      if (stage === 'ready') {
        switch (command.id) {
          case 'ready-reset':
            setStage('race');
            return;
          case 'ready-enter':
            if (player) onComplete(player);
            return;
        }
      }
    },
    [
      stage,
      race,
      baseStats,
      handleRaceSelect,
      onBack,
      handleAdjust,
      handleAdvanceToShop,
      handleFinish,
      maxFlares,
      player,
      onComplete,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = normalizeCommandKey(event);
      if (!key) return;
      const command = commandMap.get(key);
      if (!command) return;
      event.preventDefault();
      handleTrigger(command);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandMap, handleTrigger]);

  const setupPanel = (
    <Stack spacing={3}>
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
            goldRemaining={gold !== null ? gold - totalCost : null}
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
      {!isMobile && (
        <SetupCommandPanel
          title={`Setup Commands: ${stage}`}
          commands={commandList}
          onTrigger={handleTrigger}
          titleVariant="default"
        />
      )}
    </Stack>
  );

  const statsPanel = (
    <Box
      sx={(theme) => ({
        ...panelStyle(theme),
        '& .MuiTypography-root': {
          fontSize: { xs: 13, md: 16 },
        },
        '& .MuiTypography-caption': {
          fontSize: { xs: 11, md: 13 },
        },
      })}
    >
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
  );

  return (
    <Box
      sx={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gap: 3,
        containerType: 'inline-size',
        paddingBottom: { xs: 10, md: 0 },
        '@keyframes boot': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'boot 650ms ease-out',
      }}
    >
      {isMobile ? (
        <SetupGameMobile
          mobileView={mobileView}
          onSelectView={setMobileView}
          setupPanel={setupPanel}
          statsPanel={statsPanel}
        />
      ) : (
        <SetupGameDesktop setupPanel={setupPanel} statsPanel={statsPanel} />
      )}
    </Box>
  );
}
