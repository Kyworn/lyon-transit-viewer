import { pool } from '../../database/pool';
import { ingestionLogger } from '../../utils/logger';

const lockKeyFromName = (name: string): string => {
  // Stable 64-bit hash using md5, converted to bigint in SQL
  return name;
};

export const withAdvisoryLock = async <T>(
  lockName: string,
  fn: () => Promise<T>
): Promise<T | null> => {
  const lockKey = lockKeyFromName(lockName);
  const lockQuery = `SELECT pg_try_advisory_lock((('x' || substr(md5($1), 1, 16))::bit(64))::bigint) as locked;`;
  const unlockQuery = `SELECT pg_advisory_unlock((('x' || substr(md5($1), 1, 16))::bit(64))::bigint);`;

  const { rows } = await pool.query(lockQuery, [lockKey]);
  const locked = rows?.[0]?.locked === true;

  if (!locked) {
    ingestionLogger.info(`Skipping job \"${lockName}\" (lock already held)`);
    return null;
  }

  try {
    return await fn();
  } finally {
    await pool.query(unlockQuery, [lockKey]);
  }
};

export const runIngestionJob = async (
  jobName: string,
  fn: () => Promise<number>
): Promise<void> => {
  const start = new Date();
  let rowsUpserted = 0;
  let status = 'success';
  let errorMessage: string | null = null;

  try {
    rowsUpserted = await fn();
    ingestionLogger.info(`✓ ${jobName} completed (${rowsUpserted} rows)`);
  } catch (error) {
    status = 'error';
    errorMessage = error instanceof Error ? error.message : String(error);
    ingestionLogger.error(`✗ ${jobName} failed`, { error: errorMessage });
    throw error;
  } finally {
    const end = new Date();
    await pool.query(
      `INSERT INTO ingestion_runs (job_name, started_at, ended_at, status, rows_upserted, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobName, start.toISOString(), end.toISOString(), status, rowsUpserted, errorMessage]
    );
  }
};
