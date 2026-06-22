import type { ReactNode } from 'react';

import clsx from 'clsx';

import styles from './StatList.module.css';
import { Tooltip } from './Tooltip.js';

const TONE = {
  alert: styles.alert,
  loot: styles.loot,
} as const;

/** A compact label → value readout (the gameplay Status pane shape). Shared by
 *  the in-play stats and the lobby's in-progress character. */
export function StatList({ children }: { children: ReactNode }) {
  return <dl className={styles.list}>{children}</dl>;
}

function shortLabel(label: string) {
  switch (label) {
    case 'Strength':
      return 'Str';
    case 'Dexterity':
      return 'Dex';
    case 'Intelligence':
      return 'Int';
    case 'Treasures':
      return 'Treas';
    default:
      return label;
  }
}

function shortValue(gear: string) {
  switch (gear) {
    case 'Short sword':
      return 'Sh. sword';
    case 'Broadsword':
      return 'B. sword';
    case 'Chain mail':
      return 'Ch. mail';
    default:
      return gear;
  }
}

export function StatRow({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: string;
  tone?: keyof typeof TONE;
  title?: string;
}) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>
        <Tooltip content={`${label}: ${value}`}>
          {shortLabel(label)}
        </Tooltip>
      </dt>
      <dd className={clsx(styles.value, tone && TONE[tone])} title={title}>
        {shortValue(value)}
      </dd>
    </div>
  );
}
