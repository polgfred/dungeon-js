import { useEffect, useMemo } from 'react';

import clsx from 'clsx';

import { loadPlayerId } from '@dod/net/client';

import { GameplayStub } from './GameplayStub.js';
import { Lobby } from './Lobby.js';
import styles from './Play.module.css';
import { loadPlayerName, tableWsUrl } from './table.js';
import { useTable } from './useTable.js';
import { navigate } from './useRoute.js';

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
  const name = useMemo(() => loadPlayerName() || 'Adventurer', []);

  // Join (or resume) as soon as the socket is open — also re-fires on reconnect.
  const { status, join } = table;
  useEffect(() => {
    if (status === 'open') join(playerId, name);
  }, [status, join, playerId, name]);

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
