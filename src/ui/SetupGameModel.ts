import { useCallback, useEffect, useMemo, useState } from 'react';

import { ARMOR_PRICES, WEAPON_PRICES, Race } from '../dungeon/constants.js';
import { Player } from '../dungeon/model.js';
import { defaultRandomSource } from '../dungeon/rng.js';
import type { Command } from './CommandButton.js';

export type AllocationKey = 'ST' | 'DX' | 'IQ';
export type AllocationState = Record<AllocationKey, number>;
export type SetupStage = 'race' | 'allocate' | 'shop' | 'ready';
export type Stats = {
  ST: number;
  DX: number;
  IQ: number;
  HP: number;
};

export type SetupGameModel = {
  onBack: () => void;
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
  commandList: Command[];
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
  handleTrigger: (command: Command) => void;
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
  onBack,
}: {
  onComplete: (player: Player) => void;
  onBack: () => void;
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
      {
        id: 'ready-enter',
        key: 'Enter',
        label: 'Enter Dungeon',
        disabled: false,
        primary: true,
      },
      { id: 'ready-reset', key: 'R', label: 'Reset', disabled: false },
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

  return {
    onBack,
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
  };
}
