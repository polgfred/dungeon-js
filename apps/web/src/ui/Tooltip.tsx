import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './Tooltip.module.css';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={clsx(styles.wrapper, className)}>
      <span className={styles.trigger}>
        {children}
      </span>
      {content != null && content !== '' && (
        <span className={styles.tip} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
