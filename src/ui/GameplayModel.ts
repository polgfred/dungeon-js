import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Feature, Mode } from '../dungeon/constants.js';
import { Game } from '../dungeon/engine.js';
import type { Player } from '../dungeon/model.js';
import {
  serializePlayer,
  type EncounterSave,
  type GameSave,
  type PlayerSave,
} from '../dungeon/serialization.js';
import type {
  Event as GameEvent,
  PromptOption,
  StepResult,
} from '../dungeon/types.js';
import { storeSavedGame } from './gameSave.js';
import type { Command } from './CommandButton.js';

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

const helpCommand = { id: 'help', key: '?', label: 'Help', disabled: false };

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
  { id: 'spell', key: 'S', label: 'Cast Spell', disabled: false },
];

const ENDGAME_PROMPT = {
  victoryText: 'Victory! Play again?',
  gameOverText: 'Game over. Play again?',
  options: [
    { key: 'Y', label: 'Yes', disabled: false },
    { key: 'N', label: 'No', disabled: false },
  ],
};

function eventLines(events: GameEvent[]): string[] {
  return events
    .filter((event) =>
      ['INFO', 'ERROR', 'COMBAT', 'LOOT', 'DEBUG'].includes(event.kind)
    )
    .map((event) =>
      event.kind === 'DEBUG' ? JSON.stringify(event.data) : event.text
    )
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

export type GameplayProps = {
  onBack: () => void;
  onSetup: () => void;
  player: Player;
  savedGame?: GameSave | null;
};

export type GameplayModel = {
  player: Player;
  mapGrid: string[][];
  turnEvents: string[][];
  isEncounter: boolean;
  lastEventLines: string[];
  movementCommandList: Command[];
  verticalCommandList: Command[];
  encounterCommandList: Command[];
  roomCommandList: Command[];
  effectivePromptOptions: PromptOption[] | null;
  effectivePromptText: string | null;
  effectivePromptHasCancel: boolean;
  commandsForLegend: Command[];
  handleTrigger: (command: Command) => void;
  handleSave: () => void;
  lastSavedAt: string | null;
  saveError: string | null;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  onBack: () => void;
  debugSnapshot: { player: PlayerSave; encounter: EncounterSave | null } | null;
  debugOpen: boolean;
  setDebugOpen: (open: boolean) => void;
};

export function useGameplayModel({
  onBack,
  onSetup,
  player: initialPlayer,
  savedGame,
}: GameplayProps): GameplayModel {
  const gameRef = useRef<Game | null>(null);
  const loadedFromSaveRef = useRef(false);
  if (!gameRef.current) {
    if (savedGame) {
      gameRef.current = Game.fromSave(savedGame);
      loadedFromSaveRef.current = true;
    } else {
      gameRef.current = new Game({ seed: Date.now(), player: initialPlayer });
    }
  }
  const game = gameRef.current;
  const player = game.player;
  const [mode, setMode] = useState<Mode>(game.mode);
  const [mapGrid, setMapGrid] = useState<string[][]>(game.mapGrid());
  const [turnEvents, setTurnEvents] = useState<string[][]>([]);
  const [promptOptions, setPromptOptions] = useState<PromptOption[] | null>(
    null
  );
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptHasCancel, setPromptHasCancel] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<{
    player: PlayerSave;
    encounter: EncounterSave | null;
  } | null>(null);
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
  const navigationLocked =
    isEncounter || isEndState || Boolean(promptOptions && promptOptions.length);
  const movementDisabledByKey: Record<string, boolean> = {
    N: atNorthWall || navigationLocked,
    S: atSouthWall || navigationLocked,
    W: atWestWall || navigationLocked,
    E: atEastWall || navigationLocked,
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
    U: navigationLocked || currentRoomFeature !== Feature.STAIRS_UP,
    D: navigationLocked || currentRoomFeature !== Feature.STAIRS_DOWN,
    X: navigationLocked || currentRoomFeature !== Feature.EXIT,
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
  const captureDebugSnapshot = useCallback(() => {
    setDebugSnapshot({
      player: serializePlayer(player),
      encounter: game.getEncounterSave(),
    });
  }, [game, player]);
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
  const lastEventLines =
    turnEvents.length > 0 ? turnEvents[turnEvents.length - 1] : [];

  const promptCommands = useMemo(() => {
    if (!effectivePromptOptions || effectivePromptOptions.length === 0) {
      return null;
    }
    const commands = effectivePromptOptions.map((option) => ({
      id: `prompt-${option.key}`,
      key: option.key,
      label: option.label,
      disabled: option.disabled,
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
    commands.forEach((command) => map.set(command.key.toLowerCase(), command));
    return map;
  }, [activeCommands, promptCommands]);

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
      if (command.key === '?') {
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

  useEffect(() => {
    const handleHotkeys = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (!event.shiftKey) return;
      if (key === 's') {
        event.preventDefault();
        handleSave();
      } else if (key === 'q') {
        event.preventDefault();
        onBack();
      } else if (key === 'z') {
        event.preventDefault();
        captureDebugSnapshot();
        setDebugOpen(true);
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [captureDebugSnapshot, handleSave, onBack]);

  const commandsForLegend = promptCommands ?? activeCommands;

  return {
    player,
    mapGrid,
    turnEvents,
    isEncounter,
    lastEventLines,
    movementCommandList,
    verticalCommandList,
    encounterCommandList,
    roomCommandList,
    effectivePromptOptions,
    effectivePromptText,
    effectivePromptHasCancel,
    commandsForLegend,
    handleTrigger,
    handleSave,
    lastSavedAt,
    saveError,
    helpOpen,
    setHelpOpen,
    onBack,
    debugSnapshot,
    debugOpen,
    setDebugOpen,
  };
}
