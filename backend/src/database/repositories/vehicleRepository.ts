import { pool } from '../pool';
import { VehiclePosition, VehicleQueryParams } from '../../types';

export class VehicleRepository {
  async findAll(params?: VehicleQueryParams): Promise<VehiclePosition[]> {
    let query = `
      SELECT vehicle_ref, longitude, latitude, bearing, delay, published_line_name,
             destination_name, line_ref, direction_ref, stop_point_name,
             expected_arrival_time, distance_from_stop
      FROM vehicle_positions
    `;

    const whereClauses: string[] = [];
    const values: any[] = [];

    if (params?.line_sort_code) {
      // Use substring instead of LIKE to leverage the functional index
      values.push(params.line_sort_code);
      whereClauses.push(`substring(line_ref from '::(.*?):') = $${values.length}`);
    }

    if (params?.direction) {
      const directionRef = params.direction === 'Aller' ? 'outbound' : 'inbound';
      values.push(directionRef);
      whereClauses.push(`direction_ref = $${values.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const { rows } = await pool.query(query, values);
    return rows;
  }

  async deleteAll(): Promise<void> {
    await pool.query('DELETE FROM vehicle_positions');
  }

  async upsert(vehicle: Partial<VehiclePosition>): Promise<void> {
    const query = `
      INSERT INTO vehicle_positions (
        vehicle_ref, recorded_at_time, valid_until_time, line_ref, direction_ref,
        dated_vehicle_journey_ref, published_line_name, direction_name, operator_ref,
        destination_ref, destination_name, longitude, latitude, bearing, delay,
        stop_point_ref, stop_point_name, aimed_arrival_time, expected_arrival_time,
        aimed_departure_time, expected_departure_time, distance_from_stop, stop_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (vehicle_ref) DO UPDATE SET
        recorded_at_time = EXCLUDED.recorded_at_time,
        valid_until_time = EXCLUDED.valid_until_time,
        line_ref = EXCLUDED.line_ref,
        direction_ref = EXCLUDED.direction_ref,
        dated_vehicle_journey_ref = EXCLUDED.dated_vehicle_journey_ref,
        published_line_name = EXCLUDED.published_line_name,
        direction_name = EXCLUDED.direction_name,
        operator_ref = EXCLUDED.operator_ref,
        destination_ref = EXCLUDED.destination_ref,
        destination_name = EXCLUDED.destination_name,
        longitude = EXCLUDED.longitude,
        latitude = EXCLUDED.latitude,
        bearing = EXCLUDED.bearing,
        delay = EXCLUDED.delay,
        stop_point_ref = EXCLUDED.stop_point_ref,
        stop_point_name = EXCLUDED.stop_point_name,
        aimed_arrival_time = EXCLUDED.aimed_arrival_time,
        expected_arrival_time = EXCLUDED.expected_arrival_time,
        aimed_departure_time = EXCLUDED.aimed_departure_time,
        expected_departure_time = EXCLUDED.expected_departure_time,
        distance_from_stop = EXCLUDED.distance_from_stop,
        stop_order = EXCLUDED.stop_order;
    `;

    const values = [
      vehicle.vehicle_ref,
      vehicle.recorded_at_time,
      vehicle.valid_until_time,
      vehicle.line_ref,
      vehicle.direction_ref,
      vehicle.dated_vehicle_journey_ref,
      vehicle.published_line_name,
      vehicle.direction_name,
      vehicle.operator_ref,
      vehicle.destination_ref,
      vehicle.destination_name,
      vehicle.longitude,
      vehicle.latitude,
      vehicle.bearing,
      vehicle.delay,
      vehicle.stop_point_ref,
      vehicle.stop_point_name,
      vehicle.aimed_arrival_time,
      vehicle.expected_arrival_time,
      vehicle.aimed_departure_time,
      vehicle.expected_departure_time,
      vehicle.distance_from_stop,
      vehicle.stop_order,
    ];

    await pool.query(query, values);
  }
}

export const vehicleRepository = new VehicleRepository();
