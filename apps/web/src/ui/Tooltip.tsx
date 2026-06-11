import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './Tooltip.module.css';

type TooltipProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ title, children, className }: TooltipProps) {
  const tooltipProps = title ? { 'data-tooltip': title } : {};
  return (
    <span className={clsx(styles.wrapper, className)} {...tooltipProps}>
      {children}
    </span>
  );
}
