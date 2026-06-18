import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';

import styles from './Dialog.module.css';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.focus();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={clsx(styles.dialog, className)}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}

export function DialogTitle({
  children,
  onClose,
  id,
}: {
  children: ReactNode;
  onClose?: () => void;
  id?: string;
}) {
  return (
    <div className={styles.title} id={id}>
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          className={styles.close}
          onClick={onClose}
        >
          ␛
        </button>
      )}
    </div>
  );
}

export function DialogContent({
  children,
  dividers = false,
  className,
}: {
  children: ReactNode;
  dividers?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        styles.content,
        dividers && styles.contentDividers,
        className
      )}
    >
      {children}
    </div>
  );
}

export const dialogStyles = styles;
