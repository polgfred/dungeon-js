import type { ReactNode } from 'react';

import clsx from 'clsx';

import styles from './StatList.module.css';
import { Tooltip } from './Tooltip.js';

const TONE = {
  alert: styles.alert,
  loot: styles.loot,
} as const;

export function StatList({ children }: { children: ReactNode }) {
  return <dl className={styles.list}>{children}</dl>;
}

export function StatRow({
  label,
  value,
  tone,
  tip,
}: {
  label: string;
  value: string;
  tone?: keyof typeof TONE;
  tip?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>
        {tip ? (
          <Tooltip className={styles.tip} content={tip}>
            {label}
          </Tooltip>
        ) : (
          label
        )}
      </dt>
      <dd className={clsx(styles.value, tone && TONE[tone])}>{value}</dd>
    </div>
  );
}
