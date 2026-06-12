import { useState } from 'react';

import clsx from 'clsx';

import styles from './Home.module.css';
import {
  generateTableCode,
  loadPlayerName,
  normalizeTableCode,
  savePlayerName,
} from './table.js';
import { navigate } from './useRoute.js';

export default function Home() {
  const [name, setName] = useState(() => loadPlayerName());
  const [code, setCode] = useState('');

  const enter = (tableCode: string) => {
    savePlayerName(name);
    navigate(`/play/${encodeURIComponent(tableCode)}`);
  };

  const canCreate = name.trim().length > 0;
  const joinCode = normalizeTableCode(code);
  const canJoin = canCreate && joinCode.length > 0;

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
        <p className={styles.introText}>
          Now, brave adventurer:
          <br />
          prepare to enter the dungeon.
        </p>

        <div className={styles.actions}>
          <div className={styles.entry}>
            <label className={styles.field}>
              <span className={styles.label}>Enter thy name</span>
              <input
                className={styles.input}
                value={name}
                maxLength={20}
                placeholder="Adventurer"
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <button
              type="button"
              className={clsx('btn', 'btn-contained', styles.action)}
              disabled={!canCreate}
              onClick={() => enter(generateTableCode())}
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
                    if (event.key === 'Enter' && canJoin) enter(joinCode);
                  }}
                />
                <button
                  type="button"
                  className={clsx('btn', 'btn-outlined')}
                  disabled={!canJoin}
                  onClick={() => enter(joinCode)}
                >
                  Join
                </button>
              </div>
            </label>
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
