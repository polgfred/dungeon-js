import { useCallback, useMemo, useState } from 'react';

import {
  ARMOR_NAMES,
  ARMOR_PRICES,
  WEAPON_NAMES,
  WEAPON_PRICES,
  type Player,
  Race,
  defaultRandomSource,
  rollBaseStats,
  createPlayer,
} from '@dod/core';

/** A single keyed choice in the builder's prompt menus. */
export type SetupCommand = {
  id: string;
  key: string;
  label: string;
  disabled: boolean;
  primary?: boolean;
  note?: string;
};

export type AllocationKey = 'ST' | 'DX' | 'IQ';
export type AllocationState = Record<AllocationKey, number>;
export type SetupStage =
  | 'race'
  | 'allocate'
  | 'weapon'
  | 'armor'
  | 'flares'
  | 'ready';

const STAGE_ORDER: SetupStage[] = [
  'race',
  'allocate',
  'weapon',
  'armor',
  'flares',
  'ready',
];

export function stageReached(current: SetupStage, target: SetupStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target);
}

export type Stats = {
  ST: number;
  DX: number;
  IQ: number;
  HP: number;
};

export type SetupGameModel = {
  onComplete: (player: Player) => void;
  stage: SetupStage;
  race: Race | null;
  baseStats: Stats | null;
  allocations: AllocationState;
  remainingPoints: number;
  weaponTier: number;
  armorTier: number;
  flares: number;
  maxFlares: number;
  gold: number | null;
  totalCost: number;
  setupError: string | null;
  player: Player | null;
  derivedStats: Stats | null;
  commandList: SetupCommand[];
  mobileView: 'setup' | 'stats' | 'help';
  setStage: (value: SetupStage) => void;
  setWeaponTier: (value: number) => void;
  setArmorTier: (value: number) => void;
  setFlares: (value: number) => void;
  setMobileView: (value: 'setup' | 'stats' | 'help') => void;
  handleRaceSelect: (value: Race) => void;
  handleAdjust: (key: AllocationKey, delta: number) => void;
  handleAdvanceToShop: () => void;
  handleFinish: () => void;
  handleTrigger: (command: SetupCommand) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
};

function normalizeCommandKey(event: KeyboardEvent): string | null {
  if (event.key === 'Enter') return 'Enter';
  if (event.key === 'Escape') return 'Esc';
  if (event.key.length !== 1) return null;
  const upper = event.key.toUpperCase();
  return event.shiftKey ? `Shift+${upper}` : upper;
}

export function useSetupGameModel({
  onComplete,
}: {
  onComplete: (player: Player) => void;
}): SetupGameModel {
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
  // 0 = nothing chosen yet (WEAPON_NAMES[0]/ARMOR_NAMES[0] are '(None)'); a real
  // tier is picked in the shop. Keeps the readout honest without nullable fields.
  const [weaponTier, setWeaponTier] = useState(0);
  const [armorTier, setArmorTier] = useState(0);
  const [flares, setFlares] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [mobileView, setMobileView] = useState<'setup' | 'stats' | 'help'>(
    'setup'
  );

  const totalAllocated = allocations.ST + allocations.DX + allocations.IQ;
  const remainingPoints = 5 - totalAllocated;
  const weaponCost = weaponTier ? WEAPON_PRICES[weaponTier] : 0;
  const armorCost = armorTier ? ARMOR_PRICES[armorTier] : 0;
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

  // Wipe back to a fresh, unbuilt character.
  const reset = useCallback(() => {
    setStage('race');
    setRace(null);
    setBaseStats(null);
    setAllocations({ ST: 0, DX: 0, IQ: 0 });
    setGold(null);
    setWeaponTier(0);
    setArmorTier(0);
    setFlares(0);
    setSetupError(null);
    setPlayer(null);
  }, []);

  const handleRaceSelect = useCallback(
    (value: Race) => {
      const [st, dx, iq, hp] = rollBaseStats(rng, value);
      setRace(value);
      setBaseStats({ ST: st, DX: dx, IQ: iq, HP: hp });
      setAllocations({ ST: 0, DX: 0, IQ: 0 });
      setSetupError(null);
      setStage('allocate');
    },
    [rng]
  );

  const handleAdjust = useCallback((key: AllocationKey, delta: number) => {
    setAllocations((prev) => {
      const next = Math.max(0, prev[key] + delta);
      return { ...prev, [key]: next };
    });
  }, []);

  const handleAdvanceToShop = useCallback(() => {
    if (remainingPoints === 0) {
      setStage('weapon');
      if (gold === null) {
        setGold(rng.randint(50, 60));
      }
    }
  }, [gold, remainingPoints, rng]);

  const handleFinish = useCallback(() => {
    if (!race || !baseStats || gold === null) return;
    setSetupError(null);
    try {
      const created = createPlayer({
        race,
        baseStats,
        allocations,
        gold,
        weaponTier,
        armorTier,
        flares,
      });
      setPlayer(created);
      setStage('ready');
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Setup failed.');
    }
  }, [allocations, armorTier, baseStats, flares, gold, race, weaponTier]);

  const commandList = useMemo(() => {
    if (stage === 'race') {
      return [
        { id: 'race-human', key: 'H', label: 'Human', disabled: false },
        { id: 'race-dwarf', key: 'D', label: 'Dwarf', disabled: false },
        { id: 'race-elf', key: 'E', label: 'Elf', disabled: false },
        { id: 'race-halfling', key: 'L', label: 'Halfling', disabled: false },
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
      ];
    }

    if (stage === 'weapon') {
      const g = gold ?? 0;
      return [
        {
          id: 'weapon-1',
          key: 'D',
          label: WEAPON_NAMES[1],
          note: `${WEAPON_PRICES[1]}`,
          disabled: WEAPON_PRICES[1] > g,
        },
        {
          id: 'weapon-2',
          key: 'S',
          label: WEAPON_NAMES[2],
          note: `${WEAPON_PRICES[2]}`,
          disabled: WEAPON_PRICES[2] > g,
        },
        {
          id: 'weapon-3',
          key: 'B',
          label: WEAPON_NAMES[3],
          note: `${WEAPON_PRICES[3]}`,
          disabled: WEAPON_PRICES[3] > g,
        },
      ];
    }

    if (stage === 'armor') {
      // Gold left after the chosen weapon bounds what armor you can afford.
      const left = (gold ?? 0) - WEAPON_PRICES[weaponTier];
      return [
        {
          id: 'armor-1',
          key: 'L',
          label: ARMOR_NAMES[1],
          note: `${ARMOR_PRICES[1]}`,
          disabled: ARMOR_PRICES[1] > left,
        },
        {
          id: 'armor-2',
          key: 'W',
          label: ARMOR_NAMES[2],
          note: `${ARMOR_PRICES[2]}`,
          disabled: ARMOR_PRICES[2] > left,
        },
        {
          id: 'armor-3',
          key: 'C',
          label: ARMOR_NAMES[3],
          note: `${ARMOR_PRICES[3]}`,
          disabled: ARMOR_PRICES[3] > left,
        },
      ];
    }

    if (stage === 'flares') {
      return [
        {
          id: 'flares-plus',
          key: 'F',
          label: 'Flares',
          disabled: flares >= maxFlares,
        },
        {
          id: 'flares-minus',
          key: 'Shift+F',
          label: 'Flares',
          disabled: flares <= 0,
        },
        {
          id: 'flares-confirm',
          key: 'Enter',
          label: 'Confirm',
          disabled: false,
        },
      ];
    }

    return [
      {
        id: 'ready-enter',
        key: 'Enter',
        label: 'Confirm',
        disabled: false,
        primary: true,
      },
      { id: 'ready-reset', key: 'R', label: 'Reset', disabled: false },
    ];
  }, [
    stage,
    baseStats,
    allocations,
    remainingPoints,
    weaponTier,
    flares,
    maxFlares,
    gold,
  ]);

  const commandMap = useMemo(() => {
    const map = new Map<string, SetupCommand>();
    commandList
      .filter((command) => !command.disabled)
      .forEach((command) => map.set(command.key, command));
    return map;
  }, [commandList]);

  const handleTrigger = useCallback(
    (command: SetupCommand) => {
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
        }
      }

      if (stage === 'weapon') {
        switch (command.id) {
          case 'weapon-1':
            setWeaponTier(1);
            setStage('armor');
            return;
          case 'weapon-2':
            setWeaponTier(2);
            setStage('armor');
            return;
          case 'weapon-3':
            setWeaponTier(3);
            setStage('armor');
            return;
        }
      }

      if (stage === 'armor') {
        switch (command.id) {
          case 'armor-1':
            setArmorTier(1);
            setStage('flares');
            return;
          case 'armor-2':
            setArmorTier(2);
            setStage('flares');
            return;
          case 'armor-3':
            setArmorTier(3);
            setStage('flares');
            return;
        }
      }

      if (stage === 'flares') {
        switch (command.id) {
          case 'flares-plus':
            setFlares((prev) => Math.min(maxFlares, prev + 1));
            return;
          case 'flares-minus':
            setFlares((prev) => Math.max(0, prev - 1));
            return;
          case 'flares-confirm':
            handleFinish();
            return;
        }
      }

      if (stage === 'ready') {
        switch (command.id) {
          case 'ready-reset':
            reset();
            return;
          case 'ready-enter':
            if (player) onComplete(player);
            return;
        }
      }
    },
    [
      stage,
      handleRaceSelect,
      handleAdjust,
      handleAdvanceToShop,
      handleFinish,
      maxFlares,
      player,
      onComplete,
      reset,
    ]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = normalizeCommandKey(event);
      if (!key) return;
      const command = commandMap.get(key);
      if (!command) return;
      event.preventDefault();
      handleTrigger(command);
    },
    [commandMap, handleTrigger]
  );

  return {
    onComplete,
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
    setupError,
    player,
    derivedStats,
    commandList,
    mobileView,
    setStage,
    setWeaponTier,
    setArmorTier,
    setFlares,
    setMobileView,
    handleRaceSelect,
    handleAdjust,
    handleAdvanceToShop,
    handleFinish,
    handleTrigger,
    handleKeyDown,
  };
}
