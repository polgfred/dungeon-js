import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Feature, Mode } from '../dungeon/constants.js';
import { Game } from '../dungeon/engine.js';
import type { GameSave } from '../dungeon/serialization.js';
import type { Player } from '../dungeon/model.js';
import type {
  Event as GameEvent,
  PromptOption,
  StepResult,
} from '../dungeon/types.js';
import { storeSavedGame } from '../storage/gameSave.js';
import { CommandButton, type Command } from './CommandButton.js';
import helpHtmlContent from '../assets/help.html?raw';

const panelStyle = (theme: Theme) => ({
  background: alpha(theme.palette.background.paper, 0.9),
  border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
  boxShadow: `0 0 28px ${alpha(theme.palette.primary.dark, 0.4)}`,
  borderRadius: 2,
  padding: { xs: 2, md: 3 },
});

const subtleBoxStyle = (theme: Theme) => ({
  padding: 1.5,
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
  background: alpha(theme.palette.primary.dark, 0.18),
});

const movementCommands = [
  { id: 'move-north', key: 'N', label: 'North', disabled: false },
  { id: 'move-west', key: 'W', label: 'West', disabled: false },
  { id: 'move-east', key: 'E', label: 'East', disabled: false },
  { id: 'move-south', key: 'S', label: 'South', disabled: false },
];

const verticalCommands = [
  { id: 'move-up', key: 'U', label: 'Up', disabled: false },
  { id: 'move-down', key: 'D', label: 'Down', disabled: false },
  { id: 'exit', key: 'X', label: 'Exit', disabled: false },
];

const helpCommand = { id: 'help', key: 'H', label: 'Help', disabled: false };

const roomCommands = [
  { id: 'flare', key: 'F', label: 'Flare', disabled: false },
  { id: 'look', key: 'L', label: 'Look', disabled: false },
  { id: 'open', key: 'O', label: 'Open Chest', disabled: false },
  { id: 'read', key: 'R', label: 'Read Scroll', disabled: false },
  { id: 'potion', key: 'P', label: 'Drink Potion', disabled: false },
  { id: 'buy', key: 'B', label: 'Buy Items', disabled: false },
  helpCommand,
];

const encounterCommands = [
  { id: 'fight', key: 'F', label: 'Fight', disabled: false },
  { id: 'run', key: 'R', label: 'Run', disabled: false },
  { id: 'spell', key: 'S', label: 'Spell', disabled: false },
];

const ENDGAME_PROMPT = {
  victoryText: 'Victory! Play again?',
  gameOverText: 'Game over. Play again?',
  options: [
    { key: 'Y', label: 'Yes', disabled: false },
    { key: 'N', label: 'No', disabled: false },
  ],
};

function MapPanel({
  onTrigger,
  mapGrid,
  playerX,
  playerY,
  movementCommandList,
  verticalCommandList,
}: {
  onTrigger: (command: Command) => void;
  mapGrid: string[];
  playerX: number;
  playerY: number;
  movementCommandList: Command[];
  verticalCommandList: Command[];
}) {
  const rows: string[] =
    mapGrid.length > 0 ? mapGrid : Array(7).fill('? ? ? ? ? ? ?');
  const mapCellWidth = 42;

  return (
    <Box sx={(theme) => panelStyle(theme)}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
          columnGap: 10,
          rowGap: 2,
          paddingX: { xs: 0, md: 5 },
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
            width: 'fit-content',
            maxWidth: '100%',
            alignContent: 'center',
            justifyItems: 'center',
            justifyContent: 'center',
          }}
        >
          {rows.map((row, rowIndex) => (
            <Box
              key={`row-${rowIndex}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${row.split(' ').length}, minmax(0, ${mapCellWidth}px))`,
                gap: 0.5,
                width: 'fit-content',
                maxWidth: '100%',
              }}
            >
              {row.split(' ').map((cell, colIndex) => {
                const isPlayerCell =
                  rowIndex === playerY && colIndex === playerX;
                return (
                  <Tooltip
                    key={`${rowIndex}-${colIndex}`}
                    title={mapTooltip(cell)}
                    arrow
                    placement="top"
                  >
                    <Box
                      sx={(theme) => ({
                        borderRadius: 0.5,
                        border: isPlayerCell
                          ? `2px solid ${alpha(theme.palette.primary.light, 0.9)}`
                          : `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
                        background: isPlayerCell
                          ? alpha(theme.palette.primary.dark, 0.32)
                          : alpha(theme.palette.primary.dark, 0.26),
                        display: 'grid',
                        placeItems: 'center',
                        width: mapCellWidth,
                        fontSize: 14,
                        color:
                          cell === '·'
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
                );
              })}
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
              gridTemplateColumns: 'repeat(3, 1fr)',
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
        position: 'relative',
        height: 220,
        overflow: 'hidden',
      })}
    >
      <Stack
        ref={eventFeedRef}
        spacing={1.5}
        sx={{
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 0,
        }}
      >
        <Box sx={{ minHeight: 180, flexShrink: 0 }} />
        {turnEvents.length === 0 ? (
          <Typography sx={{ opacity: 0.6 }}>
            You see nothing special.
          </Typography>
        ) : (
          turnEvents.map((group, groupIndex) => {
            const isLatest = groupIndex === turnEvents.length - 1;
            return (
              <Box key={`turn-${groupIndex}`} sx={subtleBoxStyle}>
                <Stack spacing={0.5}>
                  {group.map((entry, index) => (
                    <Typography
                      key={`${entry}-${index}`}
                      sx={{
                        color: isLatest ? 'text.primary' : 'text.disabled',
                        opacity: isLatest ? 1 : 0.7,
                      }}
                    >
                      {entry}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
}

function CommandBarPanel({
  encounterMode,
  onTrigger,
  promptOptions,
  promptText,
  promptHasCancel,
  encounterCommandList,
  roomCommandList,
}: {
  encounterMode: boolean;
  onTrigger: (command: Command) => void;
  promptOptions: PromptOption[] | null;
  promptText: string | null;
  promptHasCancel: boolean;
  encounterCommandList: Command[];
  roomCommandList: Command[];
}) {
  if (promptOptions && promptOptions.length > 0) {
    const commands = promptOptions.map((option) => ({
      id: `prompt-${option.key}`,
      key: option.key,
      label: option.label,
      disabled: option.disabled,
    }));
    if (promptHasCancel) {
      commands.push({
        id: 'prompt-cancel',
        key: 'Esc',
        label: 'Cancel',
        disabled: false,
      });
    }
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
  onSave,
  lastSavedAt,
  saveError,
}: {
  encounterMode: boolean;
  onBack: () => void;
  player: Player;
  onSave: () => void;
  lastSavedAt: string | null;
  saveError: string | null;
}) {
  return (
    <Box sx={(theme) => panelStyle(theme)}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.7 }}>Mode</Typography>
          <Typography>{encounterMode ? 'Encounter' : 'Explore'}</Typography>
        </Stack>
        <Stack spacing={0.5}>
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
        <Stack spacing={0.5}>
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
        <Stack spacing={0.5}>
          <Typography sx={{ opacity: 0.7 }}>Location</Typography>
          <Typography>
            Floor {player.z + 1} · Room {player.y + 1},{player.x + 1}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          Tip: press the letter keys shown on each command.
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={onSave}>
              Save
            </Button>
            <Button variant="outlined" onClick={onBack}>
              Exit
            </Button>
          </Stack>
          {lastSavedAt && (
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Saved {lastSavedAt}
            </Typography>
          )}
          {saveError && (
            <Typography variant="caption" color="error">
              {saveError}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function HelpDialog({
  open,
  onClose,
  html,
}: {
  open: boolean;
  onClose: () => void;
  html: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '80vh',
            maxHeight: '80vh',
          },
        },
      }}
      sx={(theme) => ({
        '& .MuiDialog-paper': {
          background: theme.palette.grey[400],
          color: theme.palette.common.black,
        },
      })}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography component="span" variant="inherit">
          Dungeon of Doom
        </Typography>
        <Typography
          aria-label="Close help"
          variant="inherit"
          onClick={onClose}
          sx={{
            cursor: 'pointer',
          }}
        >
          X
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {html ? (
          <Box
            sx={{
              '& h1': { marginTop: 0 },
              '& h1, & h2, & h3': {
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              },
              '& li': { marginBottom: 0.5 },
              '& ul li::marker': { content: '"- "' },
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <Typography sx={{ opacity: 0.7 }}>
            Help text is unavailable.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
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

function resumeLines(events: GameEvent[]): string[] {
  return eventLines(events);
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
  promptHasCancel: boolean;
} {
  const promptEvent = [...events]
    .reverse()
    .find((event) => event.kind === 'PROMPT');
  if (!promptEvent) {
    return { promptOptions: null, promptText: null, promptHasCancel: false };
  }
  return {
    promptOptions: promptEvent.data?.options ?? null,
    promptText: promptEvent.text || null,
    promptHasCancel: promptEvent.data?.hasCancel ?? false,
  };
}

export default function Gameplay({
  onBack,
  onSetup,
  player: initialPlayer,
  savedGame,
}: {
  onBack: () => void;
  onSetup: () => void;
  player: Player;
  savedGame?: GameSave | null;
}) {
  const gameRef = useRef<Game | null>(null);
  const loadedFromSaveRef = useRef(false);
  if (!gameRef.current) {
    if (savedGame) {
      try {
        gameRef.current = Game.fromSave(savedGame);
        loadedFromSaveRef.current = true;
      } catch {
        gameRef.current = new Game({ seed: Date.now(), player: initialPlayer });
      }
    } else {
      gameRef.current = new Game({ seed: Date.now(), player: initialPlayer });
    }
  }
  const game = gameRef.current;
  const player = game.player;
  const [mode, setMode] = useState<Mode>(game.mode);
  const [mapGrid, setMapGrid] = useState<string[]>(game.mapGrid());
  const [turnEvents, setTurnEvents] = useState<string[][]>([]);
  const [promptOptions, setPromptOptions] = useState<PromptOption[] | null>(
    null
  );
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptHasCancel, setPromptHasCancel] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpHtml] = useState<string>(helpHtmlContent);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    savedGame?.savedAt ? new Date(savedGame.savedAt).toLocaleString() : null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialized = useRef(false);

  const isEncounter = mode === Mode.ENCOUNTER;
  const isGameOver = mode === Mode.GAME_OVER;
  const isVictory = mode === Mode.VICTORY;
  const isEndState = isGameOver || isVictory;
  const currentRoomFeature =
    game.dungeon.rooms[player.z][player.y][player.x].feature;
  const canCastSpell =
    player.iq >= 12 && Object.values(player.spells).some((count) => count > 0);
  const canRun = !player.fatigued;
  const atNorthWall = player.y <= 0;
  const atSouthWall = player.y >= Game.SIZE - 1;
  const atWestWall = player.x <= 0;
  const atEastWall = player.x >= Game.SIZE - 1;
  const movementDisabledByKey: Record<string, boolean> = {
    N: atNorthWall,
    S: atSouthWall,
    W: atWestWall,
    E: atEastWall,
  };
  const movementCommandList = useMemo(
    () =>
      movementCommands.map((command) =>
        command.key in movementDisabledByKey
          ? { ...command, disabled: movementDisabledByKey[command.key] }
          : command
      ),
    [movementDisabledByKey]
  );
  const verticalDisabledByKey: Record<string, boolean> = {
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
  const roomDisabledByKey: Record<string, boolean> = {
    F: player.flares < 1,
    L: currentRoomFeature !== Feature.MIRROR,
    O: currentRoomFeature !== Feature.CHEST,
    R: currentRoomFeature !== Feature.SCROLL,
    P: currentRoomFeature !== Feature.POTION,
    B: currentRoomFeature !== Feature.VENDOR,
    H: false,
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
  const encounterCommandList = useMemo(() => {
    const base = encounterCommands.map((command) => {
      if (command.key === 'S') {
        return { ...command, disabled: !canCastSpell };
      }
      if (command.key === 'R') {
        return { ...command, disabled: !canRun };
      }
      return command;
    });
    return [...base, helpCommand];
  }, [canCastSpell, canRun]);
  const exploreCommandList = useMemo(
    () => [...movementCommandList, ...verticalCommandList, ...roomCommandList],
    [movementCommandList, verticalCommandList, roomCommandList]
  );
  const activeCommands = useMemo(
    () => (isEncounter ? encounterCommandList : exploreCommandList),
    [isEncounter, encounterCommandList, exploreCommandList]
  );
  const effectivePromptOptions = isEndState
    ? ENDGAME_PROMPT.options
    : promptOptions;
  const effectivePromptHasCancel = isEndState ? false : promptHasCancel;
  const effectivePromptText = isEndState
    ? isVictory
      ? ENDGAME_PROMPT.victoryText
      : ENDGAME_PROMPT.gameOverText
    : promptText;

  const promptCommands = useMemo(() => {
    if (!effectivePromptOptions || effectivePromptOptions.length === 0) {
      return null;
    }
    const commands = effectivePromptOptions
      .filter((option) => !option.disabled)
      .map((option) => ({
        id: `prompt-${option.key}`,
        key: option.key,
        label: option.label,
        disabled: false,
      }));
    if (effectivePromptHasCancel) {
      commands.push({
        id: 'prompt-cancel',
        key: 'Esc',
        label: 'Cancel',
        disabled: false,
      });
    }
    return commands;
  }, [effectivePromptHasCancel, effectivePromptOptions]);

  const commandMap = useMemo(() => {
    const map = new Map<string, Command>();
    const commands = promptCommands ?? activeCommands;
    commands
      .filter((command) => {
        if (!command.disabled) return true;
        if (promptCommands) return false;
        if (!isEncounter) return true;
        return command.key === 'R';
      })
      .forEach((command) => map.set(command.key.toLowerCase(), command));
    return map;
  }, [activeCommands, promptCommands, isEncounter]);

  const applyStepResult = useCallback(
    (result: StepResult) => {
      const prompt = promptData(result.events);
      setMode(result.mode);
      setTurnEvents((prev) => appendEventFeed(prev, eventLines(result.events)));
      setMapGrid(game.mapGrid());
      setPromptOptions(prompt.promptOptions);
      setPromptText(prompt.promptText);
      setPromptHasCancel(prompt.promptHasCancel);
    },
    [game]
  );

  const handleTrigger = useCallback(
    (command: Command) => {
      if (command.key === 'H') {
        setHelpOpen(true);
        return;
      }
      if (command.id === 'prompt-cancel') {
        applyStepResult(game.attemptCancel());
        return;
      }
      if (isEndState) {
        if (command.key === 'Y') {
          onSetup();
        } else if (command.key === 'N') {
          onBack();
        }
        return;
      }
      applyStepResult(game.step(command.key));
    },
    [applyStepResult, game, isEndState, onBack, onSetup]
  );

  const handleSave = useCallback(() => {
    const save = game.toSave();
    const stored = storeSavedGame(save);
    if (stored.ok) {
      setSaveError(null);
      setLastSavedAt(new Date(save.savedAt).toLocaleString());
    } else {
      setSaveError(stored.error ?? 'Save failed.');
    }
  }, [game]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initialEvents = loadedFromSaveRef.current
      ? game.resumeEvents()
      : game.startEvents();
    const prompt = promptData(initialEvents);
    setTurnEvents((prev) =>
      appendEventFeed(
        prev,
        loadedFromSaveRef.current
          ? resumeLines(initialEvents)
          : eventLines(initialEvents)
      )
    );
    setMode(game.mode);
    setMapGrid(game.mapGrid());
    setPromptOptions(prompt.promptOptions);
    setPromptText(prompt.promptText);
    setPromptHasCancel(prompt.promptHasCancel);
  }, [game]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      let key = event.key.toLowerCase();
      if (key === 'escape') key = 'esc';
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
            playerX={player.x}
            playerY={player.y}
            movementCommandList={movementCommandList}
            verticalCommandList={verticalCommandList}
          />
          <EventFeedPanel turnEvents={turnEvents} />
          <CommandBarPanel
            encounterMode={isEncounter}
            onTrigger={handleTrigger}
            promptOptions={effectivePromptOptions}
            promptText={effectivePromptText}
            promptHasCancel={effectivePromptHasCancel}
            encounterCommandList={encounterCommandList}
            roomCommandList={roomCommandList}
          />
        </Stack>

        <PlayerReadoutPanel
          encounterMode={isEncounter}
          onBack={onBack}
          player={player}
          onSave={handleSave}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
      </Box>
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        html={helpHtml}
      />
    </Box>
  );
}
