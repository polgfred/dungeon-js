import {
  ARMOR_NAMES,
  WEAPON_NAMES,
  raceName,
  type Race,
} from '@dod/core';

import { StatList, StatRow } from './StatList.js';
import { stageReached, type SetupStage, type Stats } from './SetupGameModel.js';

/** The in-progress character, in the gameplay Status-pane shape. */
export function CharacterReadout({
  stage,
  race,
  derivedStats,
  gold,
  weaponTier,
  armorTier,
  flares,
  totalCost,
}: {
  stage: SetupStage;
  race: Race | null;
  derivedStats: Stats | null;
  gold: number | null;
  weaponTier: number;
  armorTier: number;
  flares: number;
  totalCost: number;
}) {
  const dash = '-';
  const stat = (value: number | undefined) =>
    derivedStats && value !== undefined ? String(value) : dash;
  const at = (target: SetupStage, value: string) =>
    stageReached(stage, target) ? value : dash;
  const remaining = gold !== null ? gold - totalCost : null;

  return (
    <StatList>
      <StatRow label="Race" value={race !== null ? raceName(race) : dash} />
      <StatRow label="Strength" value={stat(derivedStats?.ST)} />
      <StatRow label="Dexterity" value={stat(derivedStats?.DX)} />
      <StatRow label="Intelligence" value={stat(derivedStats?.IQ)} />
      <StatRow label="Health" value={stat(derivedStats?.HP)} />
      <StatRow label="Gold" value={gold !== null ? String(gold) : dash} />
      <StatRow label="Weapon" value={at('armor', WEAPON_NAMES[weaponTier])} />
      <StatRow label="Armour" value={at('flares', ARMOR_NAMES[armorTier])} />
      <StatRow label="Flares" value={at('flares', String(flares))} />
      <StatRow
        label="Remaining"
        value={remaining !== null ? String(remaining) : dash}
        tone={remaining !== null && remaining < 0 ? 'alert' : undefined}
      />
    </StatList>
  );
}
