import {
  ARMOR_NAMES,
  WEAPON_NAMES,
  raceName,
  type Race,
} from '@dod/core';

import { StatList, StatRow } from './StatList.js';
import type { Stats } from './SetupGameModel.js';

/** The in-progress character, in the gameplay Status-pane shape. */
export function CharacterReadout({
  race,
  derivedStats,
  gold,
  weaponTier,
  armorTier,
  flares,
  flaresChosen,
  totalCost,
}: {
  race: Race | null;
  derivedStats: Stats | null;
  gold: number | null;
  weaponTier: number;
  armorTier: number;
  flares: number;
  flaresChosen: boolean;
  totalCost: number;
}) {
  const dash = '—';
  const stat = (value: number | undefined) =>
    derivedStats && value !== undefined ? String(value) : dash;
  const remaining = gold !== null ? gold - totalCost : null;

  return (
    <StatList>
      <StatRow label="Race" value={race !== null ? raceName(race) : dash} />
      <StatRow label="Strength" value={stat(derivedStats?.ST)} />
      <StatRow label="Dexterity" value={stat(derivedStats?.DX)} />
      <StatRow label="Intelligence" value={stat(derivedStats?.IQ)} />
      <StatRow label="Health" value={stat(derivedStats?.HP)} />
      <StatRow label="Gold" value={gold !== null ? String(gold) : dash} />
      <StatRow
        label="Weapon"
        value={weaponTier > 0 ? WEAPON_NAMES[weaponTier] : dash}
      />
      <StatRow
        label="Armour"
        value={armorTier > 0 ? ARMOR_NAMES[armorTier] : dash}
      />
      <StatRow label="Flares" value={flaresChosen ? String(flares) : dash} />
      <StatRow
        label="Remaining"
        value={remaining !== null ? String(remaining) : dash}
        tone={remaining !== null && remaining < 0 ? 'alert' : undefined}
      />
    </StatList>
  );
}
