import { useEffect, useMemo, useState } from 'react';

import clsx from 'clsx';

import { loadPlayerId } from '@dod/net/client';

import { ActionChip, keyCap } from './Chips.js';
import { Gameplay } from './Gameplay.js';
import { Lobby } from './Lobby.js';
import styles from './Play.module.css';
import {
  loadPlayerName,
  loadTableName,
  savePlayerName,
  saveTableName,
  tableWsUrl,
} from './table.js';
import { useTable } from './useTable.js';
import { navigate } from './useRoute.js';

function NamePhase({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(() => loadPlayerName());
  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  };
  return (
    <div className={styles.namePhase}>
      <p className={styles.nameQuestion}>
        By what name shall thy deeds be remembered?
      </p>
      <input
        className={styles.gateInput}
        value={name}
        maxLength={20}
        placeholder="Adventurer"
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          else if (event.key === 'Escape') onCancel();
        }}
      />
      <div className={styles.nameActions}>
        <ActionChip
          cap={keyCap('Enter')}
          label="Enter"
          disabled={!name.trim()}
          onTrigger={submit}
        />
        <ActionChip cap={keyCap('Esc')} label="Back" onTrigger={onCancel} />
      </div>
    </div>
  );
}

function Notice({ title, message }: { title: string; message?: string }) {
  return (
    <div className={styles.notice}>
      <div className={clsx('ui-panel', styles.noticePanel)}>
        <h2 className={clsx('txt-h5')}>{title}</h2>
        {message && <p>{message}</p>}
        <button
          type="button"
          className={clsx('btn', 'btn-outlined')}
          onClick={() => navigate('/')}
        >
          Back to title
        </button>
      </div>
    </div>
  );
}

export default function Play({ code }: { code: string }) {
  const url = useMemo(() => tableWsUrl(code), [code]);
  const table = useTable(url);

  const playerId = useMemo(() => loadPlayerId(), []);
  // Empty until you name yourself — the first phase, for creators and joiners
  const [name, setName] = useState(() => loadTableName(code) ?? '');

  // Join (or resume) once we have a name and the socket is open — also re-fires
  // on reconnect.
  const { status, join } = table;
  useEffect(() => {
    if (status === 'open' && name) join(playerId, name);
  }, [status, join, playerId, name]);

  // Name yourself before joining — Back exits to the title (you never joined).
  if (!name) {
    return (
      <NamePhase
        onSubmit={(chosen) => {
          savePlayerName(chosen); // update the default for tables you're new to
          saveTableName(code, chosen); // remember the name for this table
          setName(chosen);
        }}
        onCancel={() => navigate('/')}
      />
    );
  }
  if (table.error) {
    return <Notice title="Cannot join" message={table.error} />;
  }
  if (table.phase === 'play' && table.view) {
    return (
      <Gameplay
        view={table.view}
        feed={table.feed}
        status={table.status}
        playerId={playerId}
        onAction={table.action}
        onCancel={table.cancel}
        onChat={table.chat}
      />
    );
  }
  if (table.lobby) {
    return (
      <Lobby
        code={code}
        lobby={table.lobby}
        playerId={playerId}
        status={table.status}
        feed={table.feed}
        onSetCharacter={table.setCharacter}
        onStart={table.start}
        onChat={table.chat}
      />
    );
  }
  return (
    <Notice
      title={table.status === 'closed' ? 'Disconnected' : 'Connecting...'}
      message={
        table.status === 'closed'
          ? 'Lost the connection to the table.'
          : `Joining ${code}...`
      }
    />
  );
}
