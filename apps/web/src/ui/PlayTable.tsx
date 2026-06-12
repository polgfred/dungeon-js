import { useEffect, useMemo, useState } from 'react';

import clsx from 'clsx';

import { loadPlayerId } from '@dod/net/client';

import { GameplayStub } from './GameplayStub.js';
import { Lobby } from './Lobby.js';
import styles from './Play.module.css';
import { loadPlayerName, savePlayerName, tableWsUrl } from './table.js';
import { useTable } from './useTable.js';
import { navigate } from './useRoute.js';

function NameGate({
  code,
  onSubmit,
}: {
  code: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  };
  return (
    <div className={styles.notice}>
      <div className={clsx('ui-panel', styles.noticePanel)}>
        <h2 className={clsx('txt-h5')}>Join {code}</h2>
        <p>What name shall the party know thee by?</p>
        <input
          className={styles.gateInput}
          value={name}
          maxLength={20}
          placeholder="Adventurer"
          autoFocus
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        />
        <button
          type="button"
          className={clsx('btn', 'btn-contained')}
          disabled={!name.trim()}
          onClick={submit}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

function Notice({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
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

export default function PlayTable({ code }: { code: string }) {
  const url = useMemo(() => tableWsUrl(code), [code]);
  const table = useTable(url);

  const playerId = useMemo(() => loadPlayerId(), []);
  // Empty when arriving via a shared link without having named yourself yet.
  const [name, setName] = useState(() => loadPlayerName());

  // Join (or resume) once we have a name and the socket is open — also re-fires
  // on reconnect.
  const { status, join } = table;
  useEffect(() => {
    if (status === 'open' && name) join(playerId, name);
  }, [status, join, playerId, name]);

  // A deep-linked player skipped the home screen — get their name before joining.
  if (!name) {
    return (
      <NameGate
        code={code}
        onSubmit={(chosen) => {
          savePlayerName(chosen);
          setName(chosen);
        }}
      />
    );
  }
  if (table.error) {
    return <Notice title="Cannot join" message={table.error} />;
  }
  if (table.phase === 'play' && table.view) {
    return (
      <GameplayStub
        view={table.view}
        feed={table.feed}
        status={table.status}
        onAction={table.action}
        onCancel={table.cancel}
      />
    );
  }
  if (table.lobby) {
    return (
      <Lobby
        code={code}
        lobby={table.lobby}
        playerId={playerId}
        onSetCharacter={table.setCharacter}
        onStart={table.start}
      />
    );
  }
  return (
    <Notice
      title={table.status === 'closed' ? 'Disconnected' : 'Connecting…'}
      message={
        table.status === 'closed'
          ? 'Lost the connection to the table.'
          : `Joining ${code}…`
      }
    />
  );
}
