import { useCallback, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { useThrottledTableSubscription } from './useThrottledTableSubscription';
import { LineIcon } from '../types';

export const useLineIcons = () => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<LineIcon[]>([]);

  const update = useCallback(() => {
    if (!conn) return;
    const rows = Array.from(conn.db.line_icon_mapping.iter() as Iterable<any>);
    const mapped: LineIcon[] = rows.map((row) => ({
      code_ligne: row.codeLigne,
      picto_mode: row.pictoMode || '',
      picto_ligne: row.pictoLigne || '',
    }));
    setData(mapped);
  }, [conn]);

  const subscribe = useCallback(
    (handler: () => void) => {
      if (!conn) return () => {};
      conn.db.line_icon_mapping.onInsert(handler);
      conn.db.line_icon_mapping.onDelete(handler);
      conn.db.line_icon_mapping.onUpdate(handler);
      return () => {
        conn.db.line_icon_mapping.removeOnInsert(handler);
        conn.db.line_icon_mapping.removeOnDelete(handler);
        conn.db.line_icon_mapping.removeOnUpdate(handler);
      };
    },
    [conn],
  );

  useThrottledTableSubscription(
    Boolean(conn && connected),
    update,
    subscribe,
    [conn, connected],
    500,
    15000,
  );

  return {
    data,
    isLoading: !connected,
    error: error ? new Error(error) : null,
  };
};
