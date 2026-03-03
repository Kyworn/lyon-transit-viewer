import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { LineIcon } from '../types';

export const useLineIcons = () => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<LineIcon[]>([]);

  useEffect(() => {
    if (!conn || !connected) return;

    const update = () => {
      const rows = Array.from(conn.db.line_icon_mapping.iter() as Iterable<any>);
      const mapped: LineIcon[] = rows.map((row) => ({
        code_ligne: row.codeLigne,
        picto_mode: row.pictoMode || '',
        picto_ligne: row.pictoLigne || '',
      }));
      setData(mapped);
    };

    update();
    const timer = window.setInterval(update, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [conn, connected]);

  return {
    data,
    isLoading: !connected,
    error: error ? new Error(error) : null,
  };
};
