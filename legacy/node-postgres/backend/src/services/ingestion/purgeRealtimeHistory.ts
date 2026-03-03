import { pool } from '../../database/pool';

export const purgeRealtimeHistory = async (retentionMinutes = 30): Promise<number> => {
  const cutoffQuery = `NOW() - INTERVAL '${retentionMinutes} minutes'`;

  const { rowCount: vehicleCount } = await pool.query(
    `DELETE FROM vehicle_positions_history WHERE recorded_at_time < ${cutoffQuery};`
  );

  const { rowCount: journeysCount } = await pool.query(
    `DELETE FROM estimated_vehicle_journeys_history WHERE recorded_at_time < ${cutoffQuery};`
  );

  const { rowCount: callsCount } = await pool.query(
    `DELETE FROM estimated_calls_history WHERE expected_arrival_time < ${cutoffQuery};`
  );

  return (vehicleCount || 0) + (journeysCount || 0) + (callsCount || 0);
};
