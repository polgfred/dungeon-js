import { useState } from 'react';

import styles from './ChatInput.module.css';

// A bare chat line. The gameplay keydown handler ignores INPUT targets, so
// typing here never leaks into game commands (Esc included).
export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };
  return (
    <input
      className={styles.input}
      value={text}
      maxLength={280}
      placeholder="Say something..."
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') send();
      }}
    />
  );
}
