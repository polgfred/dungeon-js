import clsx from 'clsx';

import styles from './CommandButton.module.css';
import { useMediaQuery } from './useMediaQuery.js';

export type Command = {
  id: string;
  key: string;
  label: string;
  disabled: boolean;
  primary?: boolean;
};

type CommandButtonProps = {
  command: Command;
  onTrigger: (command: Command) => void;
  /**
   * Layout variants:
   * - inline: label + key hint on one row.
   * - stacked: label above key hint (used for nav pad).
   * - compact: key-only button (used for tight grids).
   *
   * Responsive behavior:
   * - inline on mobile becomes "inlineCompact" (reduced sizing).
   *
   * Mixing:
   * - Layout is chosen by the caller; this component only adapts sizing.
   */
  layout?: 'inline' | 'stacked' | 'compact';
};

export function CommandButton({
  command,
  onTrigger,
  layout = 'inline',
}: CommandButtonProps) {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const stacked = layout === 'stacked';
  const compact = layout === 'compact';
  const inlineCompact = layout === 'inline' && isMobile;
  const arrowKeys: Record<string, string> = {
    N: '',
    S: '',
    W: '',
    E: '',
  };
  const displayKey = command.key.startsWith('Shift+')
    ? `${command.key.slice(6)}`
    : command.id.startsWith('move-') && command.key in arrowKeys
      ? arrowKeys[command.key]
      : command.key === 'Esc'
        ? ``
        : command.key;
  const isNav = command.id.startsWith('move-') || command.id === 'exit';
  const showKeyHint = !isMobile || compact;
  const layoutClass = compact
    ? 'ui-cmd-compact'
    : stacked
      ? 'ui-cmd-stacked'
      : inlineCompact
        ? 'ui-cmd-inline-compact'
        : 'ui-cmd-inline';
  const small = stacked || compact || inlineCompact;
  return (
    <button
      type="button"
      onClick={() => onTrigger(command)}
      disabled={Boolean(command.disabled)}
      className={clsx(
        'btn',
        command.primary ? 'btn-contained' : 'btn-outlined',
        small && 'btn-small',
        isNav && 'ui-nav-button',
        layoutClass,
        styles.button
      )}
    >
      {compact ? (
        <span className={clsx(styles.compactKey, isNav && styles.navKey)}>
          {displayKey}
        </span>
      ) : stacked ? (
        <span className={styles.stackedInner}>
          <span className={clsx(isNav && styles.navLabelStacked)}>
            {command.label}
          </span>
          {showKeyHint && (
            <span
              className={clsx(
                'txt-caption',
                isNav ? 'ui-tip-compact-nav' : 'ui-tip-compact'
              )}
            >
              {displayKey}
            </span>
          )}
        </span>
      ) : (
        <span className={styles.inlineInner}>
          <span
            className={clsx(
              styles.label,
              isNav &&
                (inlineCompact ? styles.navLabelInlineCompact : styles.navLabel)
            )}
          >
            {command.label}
          </span>
          {showKeyHint && (
            <span
              className={clsx(
                'txt-caption',
                isNav ? 'ui-tip-compact-nav' : 'ui-tip-compact'
              )}
            >
              {displayKey}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
