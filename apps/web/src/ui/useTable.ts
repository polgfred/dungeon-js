import { useEffect, useState, useSyncExternalStore } from 'react';

import { TableStore } from '@dod/net/client';

/** Subscribe a component to a table over its WebSocket. */
export function useTable(url: string) {
  const [store] = useState(() => new TableStore(url));

  useEffect(() => {
    store.connect();
    return () => store.disconnect();
  }, [store]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    join: store.join,
    setCharacter: store.setCharacter,
    start: store.start,
    action: store.action,
    cancel: store.cancel,
    chat: store.chat,
  };
}
