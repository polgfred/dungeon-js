import { useEffect, useRef, useState } from 'react';

import styles from './ChatInput.module.css';

// A bare chat line. '/' focuses it from anywhere. */
export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const send = () => {
    const trimmed = text.trim();
    if (trimmed) onSend(trimmed);
    setText('');
  };

  // '/' anywhere (outside another field) drops you into the chat line.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <input
      ref={inputRef}
      className={styles.input}
      value={text}
      maxLength={280}
      placeholder="Press / to chat"
      onInput={(event) => setText(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          send();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          setText('');
          event.currentTarget.blur();
        }
      }}
    />
  );
}
