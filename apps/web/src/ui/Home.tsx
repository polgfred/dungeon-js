import { useCallback, useEffect, useState } from 'react';

import clsx from 'clsx';

import styles from './Home.module.css';
import { generateTableCode, normalizeTableCode } from './table.js';
import { navigate } from './useRoute.js';

export default function Home() {
  const [code, setCode] = useState('');

  const go = useCallback((tableCode: string) => {
    navigate(`/play/${encodeURIComponent(tableCode)}`);
  }, []);
  const joinCode = normalizeTableCode(code);
  const canJoin = joinCode.length > 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      event.preventDefault();
      go(generateTableCode());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <div className={styles.root}>
      <div className={styles.titleFrame}>
        <div
          className={styles.titleImage}
          role="img"
          aria-label="Dungeon of Doom title screen"
        />
      </div>

      <div className={styles.intro}>
        <div className={styles.actions}>
          <div className={styles.entry}>
            <button
              type="button"
              className={clsx('btn', 'btn-contained', styles.action)}
              onClick={() => go(generateTableCode())}
            >
              Start a game
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Enter a code</span>
              <div className={styles.joinRow}>
                <input
                  className={styles.input}
                  value={code}
                  placeholder="plum-warden"
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canJoin) go(joinCode);
                  }}
                />
                <button
                  type="button"
                  className={clsx('btn', 'btn-outlined')}
                  disabled={!canJoin}
                  onClick={() => go(joinCode)}
                >
                  Join
                </button>
              </div>
            </label>

            <button
              type="button"
              className={styles.howTo}
              onClick={() => navigate('/help')}
            >
              How to play
            </button>
          </div>
        </div>
      </div>

      <div className={styles.credits}>
        <p>
          Dungeon of Doom was created by Fred Polgardy and Eric Phillips between
          Christmas 1987 and New Years 1988. It was written in BASIC on an Atari
          800XL.
        </p>
        <p>
          The original game engine was ported to Python and TypeScript in
          conversation with OpenAI's GPT-5.2-Codex.
        </p>
        <p>
          I have attempted to preserve the language and visual style of the game
          while updating to a more modern experience. Enjoy!
        </p>
      </div>
    </div>
  );
}
