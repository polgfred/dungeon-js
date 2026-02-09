import fs from 'node:fs/promises';
import path from 'node:path';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';

import { Game } from '../src/dungeon/engine.js';
import { Player } from '../src/dungeon/model.js';
import {
  FEATURE_SYMBOLS,
  Feature,
  Mode,
  Race,
} from '../src/dungeon/constants.js';
import type { Event, PromptOption } from '../src/dungeon/types.js';
import { defaultRandomSource } from '../src/dungeon/rng.js';

const MAP_TITLE = 'Dungeon Map';
const DEFAULT_SAVE_PATH = 'game.sav';
const COLORS = {
  screenBg: '#06162a',
  screenText: '#d2e3f5',
  headerBg: '#102e52',
  headerText: '#d4e5f7',
  border: '#2f5f96',
  mapBg: '#12365f',
  logBg: '#0a203d',
  promptBg: '#1e4c81',
  panelBg: '#254f82',
  panelText: '#d4e5f7',
  mapUnseen: '#7e95b5',
  logInfo: '#cfe3fa',
  logError: '#ff8f8f',
  logCombat: '#ffe4a0',
  logLoot: '#9cffbc',
};

type LogEntry = {
  text: string;
  color?: string;
  dim?: boolean;
};

type PromptState = {
  text: string;
  options: PromptOption[];
  hasCancel: boolean;
};

type InitState = {
  game: Game;
  events: Event[];
  savePath: string;
};

function createDefaultGame(options: { seed: number; debug: boolean }): Game {
  const rng = defaultRandomSource;
  const [st, dx, iq, hp] = Player.rollBaseStats(rng, Race.HUMAN);
  const player = Player.create({
    race: Race.HUMAN,
    baseStats: { ST: st, DX: dx, IQ: iq, HP: hp },
    gold: 60,
    allocations: { ST: 2, DX: 2, IQ: 1 },
    weaponTier: 1,
    armorTier: 1,
    flareCount: 5,
  });
  return new Game({ seed: options.seed, player, rng, debug: options.debug });
}

async function loadGameFromFile(
  savePath: string,
  debug: boolean
): Promise<{ game: Game | null; events: Event[] }> {
  try {
    const raw = await fs.readFile(savePath, 'utf8');
    const data = JSON.parse(raw);
    const game = Game.fromSave(data);
    if (debug) {
      // @ts-expect-error
      game.debug = true;
    }
    return { game, events: [] };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while loading save.';
    return {
      game: null,
      events: [
        {
          kind: 'ERROR',
          text: `Load failed: ${message}`,
        },
      ],
    };
  }
}

async function saveGameToFile(game: Game, savePath: string): Promise<Event[]> {
  try {
    const data = game.toSave();
    await fs.writeFile(savePath, JSON.stringify(data, null, 2), 'utf8');
    return [{ kind: 'INFO', text: `Game saved to ${savePath}.` }];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while saving.';
    return [{ kind: 'ERROR', text: `Save failed: ${message}` }];
  }
}

function renderMap(game: Game) {
  const rows: {
    key: string;
    cells: { text: string; color?: string; inverse?: boolean }[];
  }[] = [];
  rows.push({
    key: 'title',
    cells: [{ text: MAP_TITLE, color: COLORS.screenText }],
  });
  for (let y = 0; y < Game.SIZE; y += 1) {
    const cells: { text: string; color?: string; inverse?: boolean }[] = [];
    for (let x = 0; x < Game.SIZE; x += 1) {
      const room = game.dungeon.rooms[game.player.z][y][x];
      let symbol = '-';
      let color: string | undefined = undefined;
      if (!room.seen) {
        symbol = '.';
        color = COLORS.mapUnseen;
      } else if (room.monsterLevel > 0) {
        symbol = 'M';
        color = COLORS.screenText;
      } else if (room.treasureId) {
        symbol = 'T';
        color = COLORS.screenText;
      } else {
        symbol = FEATURE_SYMBOLS[room.feature] ?? '-';
        color = COLORS.screenText;
      }
      const isPlayer = y === game.player.y && x === game.player.x;
      cells.push({ text: symbol, color, inverse: isPlayer });
    }
    rows.push({ key: `row-${y}`, cells });
  }
  return rows;
}

function buildDefaultHelp(game: Game): string {
  const mode = game.mode;
  if (mode === Mode.ENCOUNTER) {
    const canRun = !game.player.fatigued;
    return `Encounter  F Fight   ${canRun ? 'R Run' : 'R Run'}   S Spell`;
  }
  const room = game.dungeon.rooms[game.player.z][game.player.y][game.player.x];
  const canUp = room.feature === Feature.STAIRS_UP;
  const canDown = room.feature === Feature.STAIRS_DOWN;
  const canFlare = game.player.flares > 0;
  const canExit = room.feature === Feature.EXIT;
  const canMirror = room.feature === Feature.MIRROR;
  const canOpen = room.feature === Feature.CHEST;
  const canRead = room.feature === Feature.SCROLL;
  const canPotion = room.feature === Feature.POTION;
  const canBuy = room.feature === Feature.VENDOR;
  const items: string[] = [];
  items.push('Explore');
  items.push('N S E W Move');
  items.push(`${canUp ? 'U Up' : 'U Up'}`);
  items.push(`${canDown ? 'D Down' : 'D Down'}`);
  items.push(`${canFlare ? 'F Flare' : 'F Flare'}`);
  items.push(`${canExit ? 'X Exit' : 'X Exit'}`);
  items.push(`${canMirror ? 'L Mirror' : 'L Mirror'}`);
  items.push(`${canOpen ? 'O Open' : 'O Open'}`);
  items.push(`${canRead ? 'R Read' : 'R Read'}`);
  items.push(`${canPotion ? 'P Potion' : 'P Potion'}`);
  items.push(`${canBuy ? 'B Buy' : 'B Buy'}`);
  items.push('H Help');
  return items.join('   ');
}

function formatPrompt(prompt: PromptState, fallback: string): string {
  if (!prompt.options.length) {
    return fallback;
  }
  const header = prompt.text ? prompt.text : 'Choose:';
  const parts: string[] = [];
  for (const option of prompt.options) {
    const label = option.label ? ` ${option.label}` : '';
    parts.push(`${option.key}${label}`);
  }
  if (prompt.hasCancel) {
    parts.push('Esc Cancel');
  }
  return `${header}  ${parts.join('   ')}`;
}

function useEventLog(initialEvents: Event[]) {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [prompt, setPrompt] = useState<PromptState>({
    text: '',
    options: [],
    hasCancel: false,
  });

  const applyEvents = (events: Event[]) => {
    let hasPrompt = false;
    let nextPrompt: PromptState | null = null;
    setLogEntries((prev) => {
      const next = [...prev];
      let wrote = false;
      for (const event of events) {
        switch (event.kind) {
          case 'INFO':
            next.push({ text: `* ${event.text}`, color: COLORS.logInfo });
            wrote = true;
            break;
          case 'ERROR':
            next.push({ text: `* ${event.text}`, color: COLORS.logError });
            wrote = true;
            break;
          case 'COMBAT':
            next.push({ text: `* ${event.text}`, color: COLORS.logCombat });
            wrote = true;
            break;
          case 'LOOT':
            next.push({ text: `* ${event.text}`, color: COLORS.logLoot });
            wrote = true;
            break;
          case 'PROMPT':
            hasPrompt = true;
            nextPrompt = {
              text: event.text,
              options: event.data?.options ?? [],
              hasCancel: event.data?.hasCancel ?? false,
            };
            break;
          case 'DEBUG':
            break;
          default:
            break;
        }
      }
      if (wrote) {
        next.push({ text: '' });
      }
      return next;
    });
    if (hasPrompt && nextPrompt) {
      setPrompt(nextPrompt);
    } else if (!events.some((event) => event.kind === 'PROMPT')) {
      setPrompt({ text: '', options: [], hasCancel: false });
    }
  };

  React.useEffect(() => {
    if (initialEvents.length) {
      applyEvents(initialEvents);
    }
  }, [initialEvents]);

  return { logEntries, prompt, applyEvents };
}

function DungeonApp(props: InitState) {
  const { exit } = useApp();
  const [game, setGame] = useState(props.game);
  const [tick, setTick] = useState(0);
  const [savePath] = useState(props.savePath);
  const { logEntries, prompt, applyEvents } = useEventLog(props.events);
  const { stdout } = useStdout();
  const logScrollRef = useRef<ScrollViewRef>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [terminalSize, setTerminalSize] = useState(() => ({
    columns: stdout.columns,
    rows: stdout.rows,
  }));
  const { columns, rows } = terminalSize;

  const mapRows = useMemo(() => renderMap(game), [game, tick]);
  const defaultHelp = useMemo(() => buildDefaultHelp(game), [game, tick]);
  const promptLine = useMemo(
    () => formatPrompt(prompt, defaultHelp),
    [prompt, defaultHelp]
  );

  const headerLine = `Dungeon of Doom`;
  const footerLine = `Ctrl+S Save | Ctrl+L Load | Ctrl+Q Quit`;

  const screenPadding = 1;
  const headerHeight = 1;
  const footerHeight = 1;
  const gapHeight = 1;
  const mapHeight = Game.SIZE + 1;
  const mapBoxHeight = mapHeight + 3;
  const promptBoxHeight = 3;
  const usableRows = Math.max(0, rows - 1);
  const contentHeight = Math.max(
    0,
    usableRows - screenPadding * 2 - headerHeight - footerHeight - gapHeight * 2
  );
  const logGutter = 1;
  const logHeight = Math.max(
    4,
    contentHeight - mapBoxHeight - promptBoxHeight - logGutter
  );
  const logViewportHeight = Math.max(1, logHeight - 1);

  const refresh = () => setTick((value) => value + 1);

  const handleStep = (command: string) => {
    const result = game.step(command);
    applyEvents(result.events);
    refresh();
  };

  const handleCancel = () => {
    const result = game.attemptCancel();
    applyEvents(result.events);
    refresh();
  };

  const handleSave = async () => {
    const events = await saveGameToFile(game, savePath);
    applyEvents(events);
    refresh();
  };

  const handleLoad = async () => {
    const { game: loaded, events } = await loadGameFromFile(savePath, false);
    if (!loaded) {
      applyEvents(events);
      refresh();
      return;
    }
    setGame(loaded);
    applyEvents([
      { kind: 'INFO', text: `Game loaded from ${savePath}.` },
      ...loaded.resumeEvents(),
    ]);
    refresh();
  };

  useEffect(() => {
    const handleResize = () => {
      setTerminalSize({
        columns: stdout.columns,
        rows: stdout.rows,
      });
      logScrollRef.current?.remeasure();
    };
    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  useEffect(() => {
    const handle = setTimeout(() => {
      logScrollRef.current?.remeasure();
      if (stickToBottom) {
        logScrollRef.current?.scrollToBottom();
      }
    }, 0);
    return () => clearTimeout(handle);
  }, [logEntries.length, stickToBottom]);

  const scrollLogBy = (delta: number) => {
    logScrollRef.current?.scrollBy(delta);
    const offset = logScrollRef.current?.getScrollOffset() ?? 0;
    const bottom = logScrollRef.current?.getBottomOffset() ?? 0;
    setStickToBottom(offset >= bottom);
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'q') {
      exit();
      return;
    }
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    if (key.ctrl && input === 's') {
      void handleSave();
      return;
    }
    if (key.ctrl && input === 'l') {
      void handleLoad();
      return;
    }
    if (key.upArrow) {
      handleStep('N');
      return;
    }
    if (key.downArrow) {
      handleStep('S');
      return;
    }
    if (key.leftArrow) {
      handleStep('W');
      return;
    }
    if (key.rightArrow) {
      handleStep('E');
      return;
    }
    if (key.escape) {
      handleCancel();
      return;
    }
    if (key.pageUp) {
      const height = logScrollRef.current?.getViewportHeight() ?? 1;
      scrollLogBy(-height);
      return;
    }
    if (key.pageDown) {
      const height = logScrollRef.current?.getViewportHeight() ?? 1;
      scrollLogBy(height);
      return;
    }
    if (!input || input.length !== 1) {
      return;
    }
    handleStep(input.toUpperCase());
  });

  const rightPaneWidth = Math.min(42, Math.max(28, Math.floor(columns * 0.35)));

  const player = game.player;
  const hpLine = `${player.hp}/${player.mhp}`;

  return (
    <Box
      flexDirection="column"
      backgroundColor={COLORS.screenBg}
      height={usableRows}
      padding={screenPadding}
    >
      <Box backgroundColor={COLORS.headerBg} paddingX={1} height={headerHeight}>
        <Text bold color={COLORS.headerText}>
          {headerLine}
        </Text>
      </Box>
      <Box height={gapHeight} />
      <Box flexDirection="row" flexGrow={1} height={contentHeight}>
        <Box flexDirection="column" flexGrow={1} marginRight={1}>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            height={mapBoxHeight}
            backgroundColor={COLORS.mapBg}
          >
            <Box flexDirection="column">
              {mapRows.map((row) => (
                <Box key={row.key} gap={1}>
                  {row.cells.map((cell, index) => (
                    <Text
                      key={`${row.key}-${index}`}
                      color={cell.color}
                      inverse={cell.inverse}
                    >
                      {cell.text}
                    </Text>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            height={logHeight + 2}
            backgroundColor={COLORS.logBg}
          >
            <ScrollView
              ref={logScrollRef}
              height={logViewportHeight}
              width="100%"
              overflow="hidden"
            >
              {logEntries.map((entry, index) => (
                <Text
                  key={`log-${index}`}
                  color={entry.color ?? COLORS.logInfo}
                  dimColor={entry.dim}
                >
                  {entry.text || ' '}
                </Text>
              ))}
            </ScrollView>
          </Box>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            height={promptBoxHeight}
            backgroundColor={COLORS.promptBg}
          >
            <Text color={COLORS.panelText}>{promptLine}</Text>
          </Box>
        </Box>
        <Box flexDirection="column" width={rightPaneWidth}>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            backgroundColor={COLORS.panelBg}
          >
            <Box flexDirection="column">
              <Text bold color={COLORS.panelText}>
                Mode
              </Text>
              <Text color={COLORS.panelText}>{Mode[game.mode]}</Text>
              <Text></Text>
              <Text bold color={COLORS.panelText}>
                Stats
              </Text>
              <Text color={COLORS.panelText}>STR {player.str}</Text>
              <Text color={COLORS.panelText}>DEX {player.dex}</Text>
              <Text color={COLORS.panelText}>IQ {player.iq}</Text>
              <Text color={player.hp < 10 ? COLORS.logError : COLORS.panelText}>
                HP {hpLine}
              </Text>
            </Box>
          </Box>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            backgroundColor={COLORS.panelBg}
          >
            <Box flexDirection="column">
              <Text bold color={COLORS.panelText}>
                Inventory
              </Text>
              <Text color={COLORS.panelText}>Gold: {player.gold}</Text>
              <Text color={COLORS.panelText}>
                Weapon: {player.weaponName}
                {player.weaponBroken ? ' *' : ''}
              </Text>
              <Text color={COLORS.panelText}>
                Armor: {player.armorName}
                {player.armorDamaged ? ' *' : ''}
              </Text>
              <Text color={COLORS.panelText}>Flares: {player.flares}</Text>
              <Text color={COLORS.panelText}>
                Treasures: {player.treasuresFound.size}/10
              </Text>
            </Box>
          </Box>
          <Box
            borderStyle="round"
            borderColor={COLORS.border}
            paddingX={1}
            backgroundColor={COLORS.panelBg}
          >
            <Box flexDirection="column">
              <Text bold color={COLORS.panelText}>
                Location
              </Text>
              <Text color={COLORS.panelText}>
                Floor {player.z + 1} - Room {player.y + 1},{player.x + 1}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box height={gapHeight} />
      <Box backgroundColor={COLORS.headerBg} paddingX={1} height={footerHeight}>
        <Text color={COLORS.headerText} dimColor>
          {footerLine}
        </Text>
      </Box>
    </Box>
  );
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token === '--seed') {
      args.set('seed', argv[i + 1]);
      i += 2;
      continue;
    }
    if (token === '--debug') {
      args.set('debug', true);
      i += 1;
      continue;
    }
    if (token === '--continue') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args.set('continue', next);
        i += 2;
      } else {
        args.set('continue', DEFAULT_SAVE_PATH);
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return args;
}

async function init(): Promise<InitState> {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.get('seed') ?? 0);
  const debug = Boolean(args.get('debug'));
  const continuePath = args.get('continue');
  const savePath = path.resolve(process.cwd(), DEFAULT_SAVE_PATH);

  if (continuePath) {
    const loadPath = path.resolve(process.cwd(), String(continuePath));
    const { game, events } = await loadGameFromFile(loadPath, debug);
    if (!game) {
      const fallback = createDefaultGame({ seed, debug });
      return {
        game: fallback,
        events: [
          ...events,
          { kind: 'INFO', text: 'Failed to load save; started a new game.' },
          ...fallback.startEvents(),
        ],
        savePath,
      };
    }
    return {
      game,
      events: [...events, ...game.resumeEvents()],
      savePath: loadPath,
    };
  }

  const game = createDefaultGame({ seed, debug });
  return {
    game,
    events: game.startEvents(),
    savePath,
  };
}

const state = await init();
render(<DungeonApp {...state} />);
