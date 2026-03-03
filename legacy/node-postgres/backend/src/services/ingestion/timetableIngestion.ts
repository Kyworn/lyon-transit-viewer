import { grandLyonApi } from '../api/grandLyonApi';
import { pool } from '../../database/pool';
import { SIRIEstimatedJourney } from '../../types';

let isIngestingTimetables = false;

/**
 * Service d'ingestion des horaires estimés (temps réel)
 * Format: SIRI Lite 2.0 (estimated-timetables.json)
 */
export const ingestEstimatedTimetables = async (): Promise<number> => {
  if (isIngestingTimetables) {
    return 0;
  }

  isIngestingTimetables = true;

  try {
    const estimatedJourneys: SIRIEstimatedJourney[] = await grandLyonApi.getEstimatedTimetables();

    if (!estimatedJourneys || !Array.isArray(estimatedJourneys)) {
      console.log('No estimated journeys found');
      return 0;
    }

    await pool.query('BEGIN');

    for (const journey of estimatedJourneys) {
      const { LineRef, DirectionRef, DatedVehicleJourneyRef, DestinationRef, EstimatedCalls } = journey;

      // Insert journey
      const journeyQuery = `
        INSERT INTO estimated_vehicle_journeys_current (recorded_at_time, line_ref, direction_ref, dated_vehicle_journey_ref, destination_ref)
        VALUES (NOW(), $1, $2, $3, $4)
        ON CONFLICT (dated_vehicle_journey_ref) DO UPDATE SET
          recorded_at_time = EXCLUDED.recorded_at_time,
          line_ref = EXCLUDED.line_ref,
          direction_ref = EXCLUDED.direction_ref,
          destination_ref = EXCLUDED.destination_ref
        RETURNING id;
      `;

      const journeyValues = [
        LineRef?.value,
        DirectionRef?.value,
        DatedVehicleJourneyRef?.value,
        DestinationRef?.value,
      ];

      const { rows: journeyRows } = await pool.query(journeyQuery, journeyValues);
      const journeyId = journeyRows[0].id;

      await pool.query(
        `INSERT INTO estimated_vehicle_journeys_history (recorded_at_time, line_ref, direction_ref, dated_vehicle_journey_ref, destination_ref)
         VALUES (NOW(), $1, $2, $3, $4);`,
        journeyValues
      );

      // Insert estimated calls for this journey
      if (EstimatedCalls?.EstimatedCall && Array.isArray(EstimatedCalls.EstimatedCall)) {
        for (const call of EstimatedCalls.EstimatedCall) {
          const {
            StopPointRef,
            Order,
            AimedArrivalTime,
            ExpectedArrivalTime,
            AimedDepartureTime,
            ExpectedDepartureTime,
          } = call;

          // Extract GTFS stop ID from SIRI format (e.g., "TCL:StopPoint:Q:123456:")
          const gtfsStopIdRaw = StopPointRef?.value.split(':')[3];
          const gtfsStopId = gtfsStopIdRaw ? Number.parseInt(gtfsStopIdRaw, 10) : NaN;
          const gtfsStopIdValue = Number.isFinite(gtfsStopId) ? gtfsStopId : null;

          const callQuery = `
            INSERT INTO estimated_calls_current (
              estimated_vehicle_journey_id, stop_point_ref, gtfs_stop_id, stop_order,
              aimed_arrival_time, expected_arrival_time, aimed_departure_time, expected_departure_time
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (estimated_vehicle_journey_id, stop_order) DO NOTHING;
          `;

          const callValues = [
            journeyId,
            StopPointRef?.value,
            gtfsStopIdValue,
            Order,
            AimedArrivalTime,
            ExpectedArrivalTime ?? AimedArrivalTime,
            AimedDepartureTime,
            ExpectedDepartureTime,
          ];

          await pool.query(callQuery, callValues);

          await pool.query(
            `INSERT INTO estimated_calls_history (
              estimated_vehicle_journey_id, stop_point_ref, gtfs_stop_id, stop_order,
              aimed_arrival_time, expected_arrival_time, aimed_departure_time, expected_departure_time
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
            callValues
          );
        }
      }
    }

    await pool.query('COMMIT');

    console.log(`✓ Successfully ingested ${estimatedJourneys.length} estimated timetables`);
    return estimatedJourneys.length;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('✗ Error ingesting estimated timetables:', error);
    throw error;
  } finally {
    isIngestingTimetables = false;
  }
};
