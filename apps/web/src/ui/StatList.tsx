import type { ReactNode } from 'react';

import clsx from 'clsx';

import styles from './StatList.module.css';

const TONE = {
  alert: styles.alert,
  loot: styles.loot,
} as const;

/** A compact label → value readout (the gameplay Status pane shape). Shared by
 *  the in-play stats and the lobby's in-progress character. */
export function StatList({ children }: { children: ReactNode }) {
  return <dl className={styles.list}>{children}</dl>;
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
      <dt className={styles.label}>{label}</dt>
      <dd className={clsx(styles.value, tone && TONE[tone])} title={title}>
        {value}
      </dd>
    </div>
  );
}
