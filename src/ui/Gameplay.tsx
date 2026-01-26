import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Mode } from '../dungeon/constants.js';
import { Game } from '../dungeon/engine.js';
import type { Player } from '../dungeon/model.js';
import type { Event as GameEvent } from '../dungeon/types.js';
type Command = {
  id: string;
  key: string;
  label: string;
};

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

const movementCommands = [
  { id: 'move-north', key: 'N', label: 'North' },
  { id: 'move-west', key: 'W', label: 'West' },
  { id: 'move-east', key: 'E', label: 'East' },
  { id: 'move-south', key: 'S', label: 'South' },
];

const verticalCommands = [
  { id: 'move-up', key: 'U', label: 'Up' },
  { id: 'move-down', key: 'D', label: 'Down' },
  { id: 'exit', key: 'X', label: 'Exit' },
];

const roomCommands = [
  { id: 'map', key: 'M', label: 'Map' },
  { id: 'flare', key: 'F', label: 'Flare' },
  { id: 'look', key: 'L', label: 'Look' },
  { id: 'open', key: 'O', label: 'Open Chest' },
  { id: 'read', key: 'R', label: 'Read Scroll' },
  { id: 'potion', key: 'P', label: 'Drink Potion' },
  { id: 'buy', key: 'B', label: 'Buy' },
  { id: 'help', key: 'H', label: 'Help' },
];

const encounterCommands = [
  { id: 'fight', key: 'F', label: 'Fight' },
  { id: 'run', key: 'R', label: 'Run' },
  { id: 'spell', key: 'S', label: 'Spell' },
];

function CommandButton({
  command,
  onTrigger,
  layout = 'inline',
}: {
  command: Command;
  onTrigger: (command: Command) => void;
  layout?: 'inline' | 'stacked';
}) {
  const stacked = layout === 'stacked';
  return (
    <Button
      variant="outlined"
      onClick={() => onTrigger(command)}
      color="primary"
      size={stacked ? 'small' : 'medium'}
      sx={(theme) => ({
        textTransform: 'none',
        letterSpacing: stacked ? 0.8 : 0.6,
        paddingY: stacked ? 0.6 : 1,
        paddingX: stacked ? 1.5 : 2,
        minWidth: stacked ? 72 : 0,
        borderColor: alpha(theme.palette.primary.light, 0.5),
        '&:hover': {
          borderColor: alpha(theme.palette.primary.light, 0.7),
          backgroundColor: alpha(theme.palette.primary.light, 0.16),
        },
      })}
    >
      {stacked ? (
        <Stack spacing={0.2} alignItems="center">
          <Typography sx={{ fontSize: 11 }}>{command.label}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 10 }}>
            {command.key}
          </Typography>
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: '100%' }}
        >
          <Typography
            sx={{
              fontSize: 13,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {command.label}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {command.key}
          </Typography>
        </Stack>
      )}
    </Button>
  );
}

function MapPanel({
  onTrigger,
  mapGrid,
  turnEvents,
}: {
  onTrigger: (command: Command) => void;
  mapGrid: string[];
  turnEvents: string[];
}) {
  const rows: string[] =
    mapGrid.length > 0 ? mapGrid : Array(7).fill('? ? ? ? ? ? ?');
  return (
    <Box sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ letterSpacing: 2 }}>
          Dungeon View
        </Typography>
        <Box
          sx={(theme) => ({
            border: `1px solid ${alpha(theme.palette.primary.light, 0.4)}`,
            borderRadius: 2,
            padding: 2,
            background: alpha(theme.palette.primary.dark, 0.35),
            minHeight: 260,
          })}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
              gap: 2,
              width: '100%',
              height: '100%',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateRows: `repeat(${rows.length}, 1fr)`,
                gap: 0.5,
                width: '100%',
                alignContent: 'center',
                justifyItems: 'center',
              }}
            >
              {rows.map((row, rowIndex) => (
                <Box
                  key={`row-${rowIndex}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${row.split(' ').length}, 1fr)`,
                    gap: 0.5,
                    width: '100%',
                    maxWidth: 360,
                  }}
                >
                  {row.split(' ').map((cell, colIndex) => (
                    <Box
                      key={`${rowIndex}-${colIndex}`}
                      sx={(theme) => ({
                        borderRadius: 0.5,
                        border: `1px solid ${alpha(
                          theme.palette.primary.light,
                          0.35
                        )}`,
                        background: alpha(theme.palette.primary.dark, 0.2),
                        display: 'grid',
                        placeItems: 'center',
                        height: 28,
                        fontSize: 14,
                        color:
                          cell === '*'
                            ? theme.palette.primary.light
                            : theme.palette.text.primary,
                      })}
                    >
                      {cell}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1,
                justifyItems: 'center',
                minWidth: 120,
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 0.5,
                  gridTemplateColumns: 'repeat(3, minmax(44px, 1fr))',
                  gridTemplateRows: 'repeat(3, 1fr)',
                }}
              >
                <Box />
                <CommandButton
                  command={movementCommands[0]}
                  onTrigger={onTrigger}
                  layout="stacked"
                />
                <Box />
                <CommandButton
                  command={movementCommands[1]}
                  onTrigger={onTrigger}
                  layout="stacked"
                />
                <Box
                  sx={{
                    borderRadius: 1,
                    border: '1px dashed rgba(255,255,255,0.2)',
                    minHeight: 40,
                  }}
                />
                <CommandButton
                  command={movementCommands[2]}
                  onTrigger={onTrigger}
                  layout="stacked"
                />
                <Box />
                <CommandButton
                  command={movementCommands[3]}
                  onTrigger={onTrigger}
                  layout="stacked"
                />
                <Box />
              </Box>
              <Stack
                spacing={0.5}
                direction="row"
                flexWrap="wrap"
                justifyContent="center"
              >
                {verticalCommands.map((command) => (
                  <CommandButton
                    key={command.id}
                    command={command}
                    onTrigger={onTrigger}
                    layout="stacked"
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
        <Box
          sx={(theme) => ({
            border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
            borderRadius: 2,
            padding: 2,
            background: alpha(theme.palette.primary.dark, 0.25),
          })}
        >
          <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
            Event Feed
          </Typography>
          <Stack spacing={0.5} sx={{ marginTop: 1 }}>
            {turnEvents.length === 0 ? (
              <Typography sx={{ opacity: 0.6 }}>No notable events.</Typography>
            ) : (
              turnEvents.map((entry, index) => (
                <Typography key={`${entry}-${index}`}>{entry}</Typography>
              ))
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function CommandBarPanel({
  encounterMode,
  onTrigger,
}: {
  encounterMode: boolean;
  onTrigger: (command: Command) => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        ...panelStyle(theme),
        paddingY: { xs: 1.5, md: 2 },
      })}
    >
      {encounterMode ? (
        <Stack spacing={2}>
          <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
            Encounter Commands
          </Typography>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            {encounterCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
              />
            ))}
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
            Command Bar
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {roomCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                onTrigger={onTrigger}
              />
            ))}
          </Box>
        </Stack>
      )}
    </Box>
  );
}

function PlayerReadoutPanel({
  encounterMode,
  onBack,
  player,
}: {
  encounterMode: boolean;
  onBack: () => void;
  player: Player;
}) {
  return (
    <Box sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2}>
        <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
          Player Readout
        </Typography>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.7 }}>Mode</Typography>
          <Typography>{encounterMode ? 'Encounter' : 'Explore'}</Typography>
        </Stack>
        <Stack spacing={1}>
          <Typography sx={{ opacity: 0.7 }}>Stats</Typography>
          <Typography>ST {player.str}</Typography>
          <Typography>DX {player.dex}</Typography>
          <Typography>IQ {player.iq}</Typography>
          <Typography>
            HP {player.hp} / {player.mhp}
          </Typography>
        </Stack>
        <Stack spacing={1}>
          <Typography sx={{ opacity: 0.7 }}>Inventory</Typography>
          <Typography>Gold: {player.gold}</Typography>
          <Typography>Weapon: {player.weaponName}</Typography>
          <Typography>Armor: {player.armorName}</Typography>
          <Typography>Flares: {player.flares}</Typography>
        </Stack>
        <Stack spacing={1}>
          <Typography sx={{ opacity: 0.7 }}>Location</Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={onBack} color="primary">
          Back to Setup
        </Button>
        <Typography sx={{ opacity: 0.6 }}>
          Tip: press the letter keys shown on each command.
        </Typography>
      </Stack>
    </Box>
  );
}

function eventLines(events: GameEvent[]): string[] {
  return events
    .filter((event) =>
      ['INFO', 'ERROR', 'COMBAT', 'LOOT', 'DEBUG', 'PROMPT'].includes(
        event.kind
      )
    )
    .map((event) => event.text)
    .filter(Boolean);
}

export default function Gameplay({
  onBack,
  player,
}: {
  onBack: () => void;
  player: Player;
}) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = new Game({ seed: Date.now(), player });
  }
  const game = gameRef.current;
  const [mode, setMode] = useState<Mode>(game.mode);
  const [mapGrid, setMapGrid] = useState<string[]>(game.getMapGrid());
  const [turnEvents, setTurnEvents] = useState<string[]>([]);
  const initialized = useRef(false);

  const isEncounter = mode === Mode.ENCOUNTER;
  const activeCommands = useMemo(
    () =>
      isEncounter
        ? encounterCommands
        : [...movementCommands, ...verticalCommands, ...roomCommands],
    [isEncounter]
  );

  const commandMap = useMemo(() => {
    const map = new Map<string, Command>();
    activeCommands.forEach((command) =>
      map.set(command.key.toLowerCase(), command)
    );
    return map;
  }, [activeCommands]);

  const handleTrigger = useCallback(
    (command: Command) => {
      const result = game.step(command.key);
      setMode(result.mode);
      setTurnEvents(eventLines(result.events));
      setMapGrid(game.getMapGrid());
    },
    [game]
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const startEvents = game.startEvents();
    setTurnEvents(eventLines(startEvents));
    setMode(game.mode);
    setMapGrid(game.getMapGrid());
  }, [game]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const command = commandMap.get(key);
      if (!command) return;
      event.preventDefault();
      handleTrigger(command);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandMap, handleTrigger]);

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
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr',
          alignItems: 'stretch',
          '@container (min-width: 1280px)': {
            gridTemplateColumns: '2fr 1fr',
          },
        }}
      >
        <Stack
          spacing={3}
          sx={{ height: '100%', justifyContent: 'space-between' }}
        >
          <MapPanel
            onTrigger={handleTrigger}
            mapGrid={mapGrid}
            turnEvents={turnEvents}
          />
          <CommandBarPanel
            encounterMode={isEncounter}
            onTrigger={handleTrigger}
          />
        </Stack>

        <PlayerReadoutPanel
          encounterMode={isEncounter}
          onBack={onBack}
          player={player}
        />
      </Box>
    </Box>
  );
}
