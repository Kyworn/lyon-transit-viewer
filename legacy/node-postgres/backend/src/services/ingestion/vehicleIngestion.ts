import { grandLyonApi } from '../api/grandLyonApi';
import { SIRIVehicleActivity } from '../../types';
import { pool } from '../../database/pool';

/**
 * Service d'ingestion des positions de véhicules en temps réel
 * Format: SIRI Lite 2.0 (vehicle-monitoring.json)
 */
export const ingestVehiclePositions = async (): Promise<number> => {
  try {
    const vehicleActivities: SIRIVehicleActivity[] = await grandLyonApi.getVehicleMonitoring();

    if (!vehicleActivities || !Array.isArray(vehicleActivities)) {
      console.log('No vehicle activities found');
      return 0;
    }

    await pool.query('BEGIN');

    for (const activity of vehicleActivities) {
      const { RecordedAtTime, ValidUntilTime, MonitoredVehicleJourney } = activity;

      const {
        LineRef,
        DirectionRef,
        FramedVehicleJourneyRef,
        PublishedLineName,
        DirectionName,
        OperatorRef,
        DestinationRef,
        DestinationName,
        VehicleLocation,
        Bearing,
        Delay,
        VehicleRef,
        MonitoredCall,
      } = MonitoredVehicleJourney;

      const vehicleRef = VehicleRef?.value;
      if (!vehicleRef) {
        continue;
      }

      const values = [
        vehicleRef,
        RecordedAtTime,
        ValidUntilTime,
        LineRef?.value,
        DirectionRef?.value,
        FramedVehicleJourneyRef?.DatedVehicleJourneyRef,
        PublishedLineName?.[0]?.value,
        DirectionName?.[0]?.value,
        OperatorRef?.value,
        DestinationRef?.value,
        DestinationName?.[0]?.value,
        VehicleLocation?.Longitude,
        VehicleLocation?.Latitude,
        Bearing,
        Delay,
        MonitoredCall?.StopPointRef?.value,
        MonitoredCall?.StopPointName?.[0]?.value,
        MonitoredCall?.AimedArrivalTime,
        MonitoredCall?.ExpectedArrivalTime,
        MonitoredCall?.AimedDepartureTime,
        MonitoredCall?.ExpectedDepartureTime,
        MonitoredCall?.DistanceFromStop,
        MonitoredCall?.Order,
      ];

      await pool.query(
        `INSERT INTO vehicle_positions_current (
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
          stop_order = EXCLUDED.stop_order;`,
        values
      );

      await pool.query(
        `INSERT INTO vehicle_positions_history (
          vehicle_ref, recorded_at_time, valid_until_time, line_ref, direction_ref,
          dated_vehicle_journey_ref, published_line_name, direction_name, operator_ref,
          destination_ref, destination_name, longitude, latitude, bearing, delay,
          stop_point_ref, stop_point_name, aimed_arrival_time, expected_arrival_time,
          aimed_departure_time, expected_departure_time, distance_from_stop, stop_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`,
        values
      );
    }

    await pool.query('COMMIT');

    console.log(`✓ Successfully ingested ${vehicleActivities.length} vehicle positions`);
    return vehicleActivities.length;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('✗ Error ingesting vehicle positions:', error);
    throw error;
  }
};
