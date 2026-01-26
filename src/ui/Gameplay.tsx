import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Feature, Mode } from '../dungeon/constants.js';
import { Game } from '../dungeon/engine.js';
import type { Player } from '../dungeon/model.js';
import type { Event as GameEvent, PromptOption } from '../dungeon/types.js';

type Command = {
  id: string;
  key: string;
  label: string;
  disabled?: boolean;
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
      disabled={Boolean(command.disabled)}
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
  movementCommandList,
  verticalCommandList,
}: {
  onTrigger: (command: Command) => void;
  mapGrid: string[];
  turnEvents: string[][];
  movementCommandList: Command[];
  verticalCommandList: Command[];
}) {
  return (
    <Box sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ letterSpacing: 2 }}>
          Dungeon View
        </Typography>
        <MapGridPanel
          mapGrid={mapGrid}
          onTrigger={onTrigger}
          movementCommandList={movementCommandList}
          verticalCommandList={verticalCommandList}
        />
        <EventFeedPanel turnEvents={turnEvents} />
      </Stack>
    </Box>
  );
}

function MapGridPanel({
  mapGrid,
  onTrigger,
  movementCommandList,
  verticalCommandList,
}: {
  mapGrid: string[];
  onTrigger: (command: Command) => void;
  movementCommandList: Command[];
  verticalCommandList: Command[];
}) {
  const rows: string[] =
    mapGrid.length > 0 ? mapGrid : Array(7).fill('? ? ? ? ? ? ?');

  return (
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
                <Tooltip
                  key={`${rowIndex}-${colIndex}`}
                  title={mapTooltip(cell)}
                  arrow
                  placement="top"
                >
                  <Box
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
                          : cell === '•' || cell === '·'
                            ? alpha(theme.palette.text.primary, 0.35)
                            : theme.palette.text.primary,
                      transition: 'background-color 150ms ease',
                      '&:hover': {
                        background: alpha(theme.palette.primary.light, 0.18),
                      },
                    })}
                  >
                    {cell}
                  </Box>
                </Tooltip>
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
              command={movementCommandList[0]}
              onTrigger={onTrigger}
              layout="stacked"
            />
            <Box />
            <CommandButton
              command={movementCommandList[1]}
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
              command={movementCommandList[2]}
              onTrigger={onTrigger}
              layout="stacked"
            />
            <Box />
            <CommandButton
              command={movementCommandList[3]}
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
            {verticalCommandList.map((command) => (
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
  );
}

function EventFeedPanel({ turnEvents }: { turnEvents: string[][] }) {
  const eventFeedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = eventFeedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turnEvents]);

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
        borderRadius: 2,
        padding: 2,
        background: alpha(theme.palette.primary.dark, 0.25),
      })}
    >
      <Box
        sx={{
          position: 'relative',
          height: 220,
          overflow: 'hidden',
        }}
      >
        <Stack
          ref={eventFeedRef}
          spacing={2.5}
          sx={{
            height: '100%',
            overflowY: 'auto',
            paddingRight: 0.5,
          }}
        >
          {turnEvents.length === 0 ? (
            <Typography sx={{ opacity: 0.6 }}>
              You see nothing special.
            </Typography>
          ) : (
            turnEvents.map((group, groupIndex) => (
              <Stack
                key={`turn-${groupIndex}`}
                spacing={0.5}
                sx={(theme) => ({
                  position: 'relative',
                  paddingLeft: '18px',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: '0px',
                    top: '16px',
                    bottom: '8px',
                    borderLeft: `4px solid ${alpha(
                      theme.palette.text.primary,
                      0.6
                    )}`,
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: '0px',
                    top: '12px',
                    width: '10px',
                    height: '4px',
                    backgroundColor: alpha(theme.palette.text.primary, 0.6),
                    boxShadow: `0 calc(100% - 1px) 0 0 ${alpha(
                      theme.palette.text.primary,
                      0.6
                    )}`,
                  },
                })}
              >
                {group.map((entry, index) => (
                  <Typography key={`${entry}-${index}`}>{entry}</Typography>
                ))}
              </Stack>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function CommandBarPanel({
  encounterMode,
  onTrigger,
  promptOptions,
  promptText,
  encounterCommandList,
  roomCommandList,
}: {
  encounterMode: boolean;
  onTrigger: (command: Command) => void;
  promptOptions: PromptOption[] | null;
  promptText: string | null;
  encounterCommandList: Command[];
  roomCommandList: Command[];
}) {
  if (promptOptions && promptOptions.length > 0) {
    return (
      <Box
        sx={(theme) => ({
          ...panelStyle(theme),
          paddingY: { xs: 1.5, md: 2 },
        })}
      >
        <Stack spacing={2}>
          <Typography sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
            {promptText || 'Choose'}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {promptOptions.map((option) => (
              <CommandButton
                key={`prompt-${option.key}`}
                command={{
                  id: `prompt-${option.key}`,
                  key: option.key,
                  label: option.label,
                  disabled: option.disabled,
                }}
                onTrigger={onTrigger}
              />
            ))}
          </Box>
        </Stack>
      </Box>
    );
  }

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
            {encounterCommandList.map((command) => (
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
            Explore Commands
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {roomCommandList.map((command) => (
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
          <Typography
            sx={(theme) => ({
              color:
                player.hp < 10
                  ? theme.palette.error.light
                  : theme.palette.text.primary,
            })}
          >
            HP {player.hp} / {player.mhp}
          </Typography>
        </Stack>
        <Stack spacing={1}>
          <Typography sx={{ opacity: 0.7 }}>Inventory</Typography>
          <Typography>Gold: {player.gold}</Typography>
          <Typography>Weapon: {player.weaponName}</Typography>
          <Typography>
            Armor: {player.armorName}
            {player.armorDamaged ? '*' : ''}
          </Typography>
          <Typography>Flares: {player.flares}</Typography>
          <Typography>Treasures: {player.treasuresFound.size}</Typography>
        </Stack>
        <Stack spacing={1}>
          <Typography sx={{ opacity: 0.7 }}>Location</Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
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
      ['INFO', 'ERROR', 'COMBAT', 'LOOT', 'DEBUG'].includes(event.kind)
    )
    .map((event) => event.text)
    .filter(Boolean);
}

const EVENT_FEED_LIMIT = 10;

function appendEventFeed(previous: string[][], next: string[]): string[][] {
  if (next.length === 0) return previous;
  const combined = [...previous, next];
  if (combined.length <= EVENT_FEED_LIMIT) return combined;
  return combined.slice(combined.length - EVENT_FEED_LIMIT);
}

function mapTooltip(cell: string): string {
  switch (cell) {
    case '*':
      return 'You';
    case '•':
    case '·':
      return 'Unknown';
    case '-':
      return 'Empty';
    case 'M':
      return 'Monster';
    case 'T':
      return 'Treasure';
    case 'm':
      return 'Mirror';
    case 's':
      return 'Scroll';
    case 'c':
      return 'Chest';
    case 'f':
      return 'Flares';
    case 'p':
      return 'Potion';
    case 'v':
      return 'Vendor';
    case 't':
      return 'Thief';
    case 'w':
      return 'Warp';
    case 'U':
      return 'Stairs Up';
    case 'D':
      return 'Stairs Down';
    case 'X':
      return 'Exit';
    default:
      return '';
  }
}

function promptData(events: GameEvent[]): {
  promptOptions: PromptOption[] | null;
  promptText: string | null;
} {
  const promptEvent = [...events]
    .reverse()
    .find((event) => event.kind === 'PROMPT');
  if (!promptEvent) {
    return { promptOptions: null, promptText: null };
  }
  return {
    promptOptions: promptEvent.data?.options ?? null,
    promptText: promptEvent.text || null,
  };
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
  const [mapGrid, setMapGrid] = useState<string[]>(game.mapGrid());
  const [turnEvents, setTurnEvents] = useState<string[][]>([]);
  const [promptOptions, setPromptOptions] = useState<PromptOption[] | null>(
    null
  );
  const [promptText, setPromptText] = useState<string | null>(null);
  const initialized = useRef(false);

  const isEncounter = mode === Mode.ENCOUNTER;
  const currentRoomFeature =
    game.dungeon.rooms[player.z][player.y][player.x].feature;
  const canCastSpell =
    player.iq >= 12 && Object.values(player.spells).some((count) => count > 0);
  const movementCommandList = movementCommands;
  const verticalDisabledByKey: Partial<Record<string, boolean>> = {
    U: currentRoomFeature !== Feature.STAIRS_UP,
    D: currentRoomFeature !== Feature.STAIRS_DOWN,
    X: currentRoomFeature !== Feature.EXIT,
  };
  const verticalCommandList = useMemo(
    () =>
      verticalCommands.map((command) =>
        command.key in verticalDisabledByKey
          ? { ...command, disabled: verticalDisabledByKey[command.key] }
          : command
      ),
    [verticalDisabledByKey]
  );
  const roomDisabledByKey: Partial<Record<string, boolean>> = {
    F: player.flares < 1,
    L: currentRoomFeature !== Feature.MIRROR,
    O: currentRoomFeature !== Feature.CHEST,
    R: currentRoomFeature !== Feature.SCROLL,
    P: currentRoomFeature !== Feature.POTION,
    B: currentRoomFeature !== Feature.VENDOR,
  };
  const roomCommandList = useMemo(
    () =>
      roomCommands.map((command) =>
        command.key in roomDisabledByKey
          ? { ...command, disabled: roomDisabledByKey[command.key] }
          : command
      ),
    [roomDisabledByKey]
  );
  const encounterCommandList = useMemo(
    () =>
      encounterCommands.map((command) =>
        command.key === 'S' ? { ...command, disabled: !canCastSpell } : command
      ),
    [canCastSpell]
  );
  const exploreCommandList = useMemo(
    () => [...movementCommandList, ...verticalCommandList, ...roomCommandList],
    [movementCommandList, verticalCommandList, roomCommandList]
  );
  const activeCommands = useMemo(
    () => (isEncounter ? encounterCommandList : exploreCommandList),
    [isEncounter, encounterCommandList, exploreCommandList]
  );
  const promptCommands = useMemo(() => {
    if (!promptOptions || promptOptions.length === 0) return null;
    return promptOptions
      .filter((option) => !option.disabled)
      .map((option) => ({
        id: `prompt-${option.key}`,
        key: option.key,
        label: option.label,
      }));
  }, [promptOptions]);

  const commandMap = useMemo(() => {
    const map = new Map<string, Command>();
    const commands = promptCommands ?? activeCommands;
    const allowDisabledInput = !promptCommands && !isEncounter;
    commands
      .filter(
        (command) =>
          allowDisabledInput || !('disabled' in command && command.disabled)
      )
      .forEach((command) => map.set(command.key.toLowerCase(), command));
    return map;
  }, [activeCommands, promptCommands, isEncounter]);

  const handleTrigger = useCallback(
    (command: Command) => {
      const result = game.step(command.key);
      const prompt = promptData(result.events);
      setMode(result.mode);
      setTurnEvents((prev) => appendEventFeed(prev, eventLines(result.events)));
      setMapGrid(game.mapGrid());
      setPromptOptions(prompt.promptOptions);
      setPromptText(prompt.promptText);
    },
    [game]
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const startEvents = game.startEvents();
    const prompt = promptData(startEvents);
    setTurnEvents((prev) => appendEventFeed(prev, eventLines(startEvents)));
    setMode(game.mode);
    setMapGrid(game.mapGrid());
    setPromptOptions(prompt.promptOptions);
    setPromptText(prompt.promptText);
  }, [game]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      let key = event.key.toLowerCase();
      if (key === 'arrowup') key = 'n';
      if (key === 'arrowdown') key = 's';
      if (key === 'arrowleft') key = 'w';
      if (key === 'arrowright') key = 'e';
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
            movementCommandList={movementCommandList}
            verticalCommandList={verticalCommandList}
          />
          <CommandBarPanel
            encounterMode={isEncounter}
            onTrigger={handleTrigger}
            promptOptions={promptOptions}
            promptText={promptText}
            encounterCommandList={encounterCommandList}
            roomCommandList={roomCommandList}
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
