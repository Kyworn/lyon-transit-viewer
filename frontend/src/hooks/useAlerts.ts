import { useEffect, useState } from 'react';
import { useSpacetime } from '../spacetime/useSpacetime';
import { Alert } from '../types';

const CODE_PATTERN = /\b(JD\d{2,4}|GE\d{1,3}|M[A-D]|T\d{1,2}|F\d{1,2}|C\d{1,3}|S\d{1,3}|RX|REX|R\d{1,2}|\d{1,4})\b/gi;

const extractLineCodes = (...sources: Array<string | null | undefined>) => {
  const out = new Set<string>();
  for (const source of sources) {
    const raw = (source || '').trim();
    if (!raw) continue;

    const normalized = raw
      .replace(/Ligne[s]?/gi, ' ')
      .replace(/Rhônexpress/gi, 'RX')
      .replace(/Rhonexpress/gi, 'RX');

    const tokens = normalized.split(/[;,|/]/).map((v) => v.trim()).filter(Boolean);
    const scan = tokens.length > 0 ? tokens : [normalized];

    for (const value of scan) {
      const matches = value.match(CODE_PATTERN);
      if (!matches) continue;
      matches.forEach((m) => {
        const token = m.toUpperCase();
        if (/^\d{4}$/.test(token)) return; // internal ids, not customer-facing lines
        out.add(token);
      });
    }
  }
  return Array.from(out);
};

export const useAlerts = () => {
  const { conn, connected, error } = useSpacetime();
  const [data, setData] = useState<Alert[]>([]);

  useEffect(() => {
    if (!conn || !connected) return;

    const update = () => {
      const rows = Array.from(conn.db.alerts.iter() as Iterable<any>);
      const mapped: Alert[] = rows.map((row) => {
        const affected = extractLineCodes(row.objectList, row.lineCommercialName, row.lineCustomerName);
        return {
          affected_lines: affected,
          lines_count: affected.length,
          id: row.alertId ?? undefined,
          title: row.title || '',
          message: row.message || '',
          severity_type: row.severityType || undefined,
          line_commercial_name: row.lineCommercialName || undefined,
          start_time: row.startTime || undefined,
          end_time: row.endTime || undefined,
        };
      });
      setData(mapped);
    };

    update();
    const timer = window.setInterval(update, 5000);

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
