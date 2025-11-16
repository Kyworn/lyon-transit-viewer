import { grandLyonApi } from '../api/grandLyonApi';
import { vehicleRepository } from '../../database/repositories';
import { SIRIVehicleActivity } from '../../types';

/**
 * Service d'ingestion des positions de véhicules en temps réel
 * Format: SIRI Lite 2.0 (vehicle-monitoring.json)
 */
export const ingestVehiclePositions = async (): Promise<void> => {
  try {
    // Purge existing data before inserting fresh real-time data
    await vehicleRepository.deleteAll();

    const vehicleActivities: SIRIVehicleActivity[] = await grandLyonApi.getVehicleMonitoring();

    if (!vehicleActivities || !Array.isArray(vehicleActivities)) {
      console.log('No vehicle activities found');
      return;
    }

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

      await vehicleRepository.upsert({
        vehicle_ref: VehicleRef?.value,
        recorded_at_time: RecordedAtTime,
        valid_until_time: ValidUntilTime,
        line_ref: LineRef?.value,
        direction_ref: DirectionRef?.value,
        dated_vehicle_journey_ref: FramedVehicleJourneyRef?.DatedVehicleJourneyRef,
        published_line_name: PublishedLineName?.[0]?.value,
        direction_name: DirectionName?.[0]?.value,
        operator_ref: OperatorRef?.value,
        destination_ref: DestinationRef?.value,
        destination_name: DestinationName?.[0]?.value,
        longitude: VehicleLocation?.Longitude,
        latitude: VehicleLocation?.Latitude,
        bearing: Bearing,
        delay: Delay,
        stop_point_ref: MonitoredCall?.StopPointRef?.value,
        stop_point_name: MonitoredCall?.StopPointName?.[0]?.value,
        aimed_arrival_time: MonitoredCall?.AimedArrivalTime,
        expected_arrival_time: MonitoredCall?.ExpectedArrivalTime,
        aimed_departure_time: MonitoredCall?.AimedDepartureTime,
        expected_departure_time: MonitoredCall?.ExpectedDepartureTime,
        distance_from_stop: MonitoredCall?.DistanceFromStop,
        stop_order: MonitoredCall?.Order,
      });
    }

    console.log(`✓ Successfully ingested ${vehicleActivities.length} vehicle positions`);
  } catch (error) {
    console.error('✗ Error ingesting vehicle positions:', error);
    throw error;
  }
};
