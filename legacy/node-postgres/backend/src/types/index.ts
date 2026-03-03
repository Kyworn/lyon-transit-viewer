// Database entity types
export interface Stop {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  pmr_accessible: boolean;
  service_info: string;
  has_elevator: boolean;
  has_escalator: boolean;
  address: string;
  municipality: string;
  zone: string;
  gtfs_stop_id?: string;
}

export interface Station {
  id: string;
  station_api_id: string;
  name: string;
  service_info: string;
  last_update: string;
  longitude: number;
  latitude: number;
  station_id: string;
}

export interface Line {
  id: string;
  line_name: string;
  trace_code: string;
  line_code: string;
  trace_type: string;
  trace_name: string;
  direction: string;
  origin_id: string;
  destination_id: string;
  origin_name: string;
  destination_name: string;
  transport_family: string;
  start_date: string;
  end_date: string;
  line_type_code: string;
  line_type_name: string;
  pmr_accessible: boolean;
  line_sort_code: string;
  version_name: string;
  last_update: string;
  category: string;
  color: string;
}

export interface VehiclePosition {
  id?: number;
  vehicle_ref: string;
  recorded_at_time: string;
  valid_until_time: string;
  line_ref: string;
  direction_ref: string;
  dated_vehicle_journey_ref: string;
  published_line_name: string;
  direction_name: string;
  operator_ref: string;
  destination_ref: string;
  destination_name: string;
  longitude: number;
  latitude: number;
  bearing: number;
  delay: string;
  stop_point_ref: string;
  stop_point_name: string;
  aimed_arrival_time: string;
  expected_arrival_time: string;
  aimed_departure_time: string;
  expected_departure_time: string;
  distance_from_stop: number;
  stop_order: number;
}

export interface Alert {
  id?: number;
  alert_id: number;
  type: string;
  cause: string;
  start_time: string;
  end_time: string;
  mode: string;
  line_commercial_name: string;
  line_customer_name: string;
  title: string;
  message: string;
  last_update: string;
  severity_type: string;
  severity_level: number;
  object_type: string;
  object_list: string;
  affected_lines?: string[]; // Array of all affected line names
  lines_count?: number; // Number of affected lines
}

export interface NextPassage {
  vehicle_ref: string | null;
  line_ref: string | null;
  direction_ref: string;
  destination_name: string;
  delay: string;
  stop_point_name: string;
  expected_arrival_time: string | null;
  distance_from_stop: number | null;
  published_line_name: string;
  line_destination: string;
  scheduled_arrival_time: string;
  route_color: string;
  route_text_color: string;
}

export interface LineIconMapping {
  code_ligne: string;
  picto_mode: string;
  picto_ligne: string;
}

// External API response types (GrandLyon/SIRI)
export interface SIRIVehicleActivity {
  RecordedAtTime: string;
  ValidUntilTime: string;
  MonitoredVehicleJourney: {
    LineRef: { value: string };
    DirectionRef: { value: string };
    FramedVehicleJourneyRef: { DatedVehicleJourneyRef: string };
    PublishedLineName: [{ value: string }];
    DirectionName: [{ value: string }];
    OperatorRef: { value: string };
    DestinationRef: { value: string };
    DestinationName: [{ value: string }];
    VehicleLocation: {
      Longitude: number;
      Latitude: number;
    };
    Bearing: number;
    Delay: string;
    VehicleRef: { value: string };
    MonitoredCall: {
      StopPointRef: { value: string };
      StopPointName: [{ value: string }];
      AimedArrivalTime: string;
      ExpectedArrivalTime: string;
      AimedDepartureTime: string;
      ExpectedDepartureTime: string;
      DistanceFromStop: number;
      Order: number;
    };
  };
}

export interface SIRIEstimatedJourney {
  LineRef: { value: string };
  DirectionRef: { value: string };
  DatedVehicleJourneyRef: { value: string };
  DestinationRef: { value: string };
  EstimatedCalls: {
    EstimatedCall: Array<{
      StopPointRef: { value: string };
      Order: number;
      AimedArrivalTime: string;
      ExpectedArrivalTime: string;
      AimedDepartureTime: string;
      ExpectedDepartureTime: string;
    }>;
  };
}

// Query parameter types
export interface VehicleQueryParams {
  line_sort_code?: string;
  direction?: 'Aller' | 'Retour';
}

// Error response type
export interface ErrorResponse {
  error: string;
  details?: string;
}
