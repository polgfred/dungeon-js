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
import { type ReactNode } from 'react';

import helpHtmlContent from '../assets/help.html?raw';
import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  Race,
} from '../dungeon/constants.js';
import { Player } from '../dungeon/model.js';
import { CommandButton, type Command } from './CommandButton.js';
import {
  type AllocationKey,
  type AllocationState,
  type SetupGameModel,
  type Stats,
  useSetupGameModel,
} from './SetupGameModel.js';

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

const setupTitleSx = {
  letterSpacing: 2,
  fontSize: { xs: 18, md: 'inherit' },
};

const setupBodySx = {
  opacity: 0.75,
  fontSize: { xs: 13, md: 16 },
};

function MobileHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <Box
      className="ui-panel"
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
          sx={{ cursor: 'pointer', opacity: 0.75 }}
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
          '& h2, & h3': { opacity: 0.75 },
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
        }
      : { letterSpacing: 2, textTransform: 'uppercase' };
  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
        paddingY: { xs: 1.5, md: 2 },
      })}
    >
      <Stack spacing={2}>
        <Typography
          className={
            titleVariant === 'compact'
              ? 'ui-panel-title-compact'
              : 'ui-panel-title'
          }
          sx={titleSx}
        >
          {title}
        </Typography>
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
      <Typography variant="h5" sx={setupTitleSx}>
        Choose Thy Race
      </Typography>
      <Typography sx={setupBodySx}>
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
                  opacity: 0.75,
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
          <Typography sx={{ opacity: 0.75 }}>Rolled Stats</Typography>
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
      <Typography variant="h5" sx={setupTitleSx}>
        Allocate Points
      </Typography>
      <Typography sx={setupBodySx}>
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
                <Typography sx={{ opacity: 0.75 }}>
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
      <Typography variant="h5" sx={setupTitleSx}>
        Arm Thyself
      </Typography>
      <Typography sx={setupBodySx}>
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
      <Typography sx={{ opacity: 0.75, color: 'text.secondary' }}>
        Gold remaining: {goldRemaining !== null ? goldRemaining : '--'}
      </Typography>
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
      <Typography variant="h5" sx={setupTitleSx}>
        Setup Complete
      </Typography>
      <Typography sx={setupBodySx}>
        Brave adventurer, thy gear outfits thee well! But alas, this quest is
        not for the faint of heart. Are you ready to enter the dungeon?
      </Typography>
      <Stack spacing={1}>
        <Typography>Weapon: {player.weaponName}</Typography>
        <Typography>Armor: {player.armorName}</Typography>
        <Typography>Flares: {player.flares}</Typography>
        <Typography>Gold Remaining: {player.gold}</Typography>
      </Stack>
      <Typography sx={setupBodySx}>THE DUNGEON AWAITS YOU...</Typography>
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
        <Typography sx={{ opacity: 0.75 }}>Race</Typography>
        <Typography>
          {race
            ? raceOptions.find((option) => option.value === race)?.label
            : 'Unassigned'}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography sx={{ opacity: 0.75 }}>Stats</Typography>
        <Typography>ST {derivedStats ? derivedStats.ST : '--'}</Typography>
        <Typography>DX {derivedStats ? derivedStats.DX : '--'}</Typography>
        <Typography>IQ {derivedStats ? derivedStats.IQ : '--'}</Typography>
        <Typography>HP {derivedStats ? derivedStats.HP : '--'}</Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography sx={{ opacity: 0.75 }}>Inventory</Typography>
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
      <Typography variant="caption" className="ui-tip">
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

function SetupPanel({
  isMobile,
  model,
}: {
  isMobile: boolean;
  model: SetupGameModel;
}) {
  return (
    <Stack spacing={3}>
      <Box className="ui-panel" sx={(theme) => panelStyle(theme)}>
        {model.stage === 'race' && (
          <RaceStage
            race={model.race}
            baseStats={model.baseStats}
            onSelect={model.handleRaceSelect}
            onBack={model.onBack}
            onConfirm={() => model.setStage('allocate')}
          />
        )}

        {model.stage === 'allocate' && (
          <AllocationStage
            baseStats={model.baseStats}
            allocations={model.allocations}
            remainingPoints={model.remainingPoints}
            onAdjust={model.handleAdjust}
            onBack={() => model.setStage('race')}
            onConfirm={model.handleAdvanceToShop}
          />
        )}

        {model.stage === 'shop' && (
          <ShopStage
            weaponTier={model.weaponTier}
            armorTier={model.armorTier}
            flares={model.flares}
            maxFlares={model.maxFlares}
            goldRemaining={
              model.gold !== null ? model.gold - model.totalCost : null
            }
            setupError={model.setupError}
            onWeaponTier={model.setWeaponTier}
            onArmorTier={model.setArmorTier}
            onFlaresChange={model.setFlares}
            onBack={() => model.setStage('allocate')}
            onConfirm={model.handleFinish}
            disableConfirm={model.gold === null || model.totalCost > model.gold}
          />
        )}

        {model.stage === 'ready' && model.player && (
          <ReadyStage
            player={model.player}
            onReset={() => model.setStage('race')}
            onComplete={model.onComplete}
          />
        )}
      </Box>
      {!isMobile && (
        <SetupCommandPanel
          title={`Setup Commands: ${model.stage}`}
          commands={model.commandList}
          onTrigger={model.handleTrigger}
          titleVariant="default"
        />
      )}
    </Stack>
  );
}

function StatsPanel({
  model,
}: {
  model: SetupGameModel;
}) {
  return (
    <Box
      className="ui-panel"
      sx={(theme) => ({
        ...panelStyle(theme),
      })}
    >
      <StatusReadout
        race={model.race}
        derivedStats={model.derivedStats}
        gold={model.gold}
        weaponTier={model.weaponTier}
        armorTier={model.armorTier}
        flares={model.flares}
        totalCost={model.totalCost}
      />
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
  const model = useSetupGameModel({ onComplete, onBack });

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
          mobileView={model.mobileView}
          onSelectView={model.setMobileView}
          setupPanel={
            <SetupPanel isMobile={isMobile} model={model} />
          }
          statsPanel={<StatsPanel model={model} />}
        />
      ) : (
        <SetupGameDesktop
          setupPanel={
            <SetupPanel isMobile={isMobile} model={model} />
          }
          statsPanel={<StatsPanel model={model} />}
        />
      )}
    </Box>
  );
}
