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
    <div className={styles.home}>
      <h1 className={styles.title}>
        DUNGEON <span className={styles.titleOf}>of</span> DOOM
      </h1>

      <div className={clsx('ui-panel', styles.panel)}>
        <label className={styles.field}>
          <span className={styles.label}>Thy name</span>
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
  );
}
