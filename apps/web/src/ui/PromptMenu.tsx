import type { ReactNode } from 'react';

import clsx from 'clsx';

import styles from './PromptMenu.module.css';

/** Render a command key as a compact keycap glyph. */
export function keyCap(key: string): string {
  if (key === 'Enter') return '√'; // √
  if (key === 'Esc') return '␛'; // ␛
  if (key.startsWith('Shift+')) return `⇧${key.slice(6)}`; // ⇧X
  return key;
}

/** The prompt-menu shell: an optional question over a column of chips. Mirrors
 *  the gameplay prompt look so the builder reads like an in-game menu. */
export function PromptMenu({
  question,
  children,
}: {
  question?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.menu}>
      {question && <p className={styles.question}>{question}</p>}
      <div className={styles.chips}>{children}</div>
    </div>
  );
}

/** A keyed selection chip — `<key> Label … note`, highlighted when chosen. The
 *  note (e.g. a price) sits in its own right-aligned column so they line up. */
export function SelectChip({
  cap,
  label,
  note,
  active,
  disabled,
  onSelect,
}: {
  cap: string;
  label: string;
  note?: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={clsx(styles.chip, active && styles.chipActive)}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className={styles.key}>{cap}</span>
      <span className={styles.label}>{label}</span>
      {note && <span className={styles.note}>{note}</span>}
    </button>
  );
}

/** A keyed action chip (Confirm / Back / etc). */
export function ActionChip({
  cap,
  label,
  disabled,
  onTrigger,
}: {
  cap: string;
  label: string;
  disabled?: boolean;
  onTrigger: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.chip}
      disabled={disabled}
      onClick={onTrigger}
    >
      <span className={styles.key}>{cap}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}

/** An adjustable: a label + value with clickable ▲/▼ sides. The matching key
 *  raises and Shift+key lowers it from the keyboard (shown as the keycap). */
export function AdjustChip({
  cap,
  label,
  value,
  onUp,
  onDown,
  upDisabled,
  downDisabled,
}: {
  cap: string;
  label: string;
  value: string;
  onUp: () => void;
  onDown: () => void;
  upDisabled?: boolean;
  downDisabled?: boolean;
}) {
  return (
    <div className={styles.adjust}>
      <span className={styles.key}>{cap}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.adjustValue}>{value}</span>
      <span className={styles.adjustBtns}>
        <button
          type="button"
          className={styles.adjustBtn}
          aria-label={`Lower ${label}`}
          disabled={downDisabled}
          onClick={onDown}
        >
          {'↓'}
        </button>
        <button
          type="button"
          className={styles.adjustBtn}
          aria-label={`Raise ${label}`}
          disabled={upDisabled}
          onClick={onUp}
        >
          {'↑'}
        </button>
      </span>
    </div>
  );
}
