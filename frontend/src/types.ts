export interface Line {
  id: string;
  line_name: string;
  trace_code: string;
  line_code: string;
  category: string;
  color: string;
  line_sort_code: string;
  destination_name: string;
  direction: string;
  line_type_name: string;
}

export interface Stop {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  pmr_accessible: boolean;
  has_elevator: boolean;
  has_escalator: boolean;
  address: string;
  municipality: string;
  zone: string;
  service_info: string;
}

export interface Vehicle {
  vehicle_ref: string;
  longitude: number;
  latitude: number;
  bearing: number;
  delay: string;
  published_line_name: string;
  destination_name: string;
  line_ref: string;
  stop_point_name?: string;
  expected_arrival_time?: string;
  distance_from_stop?: number;
}

export interface LineIcon {
  code_ligne: string;
  picto_mode: string;
  picto_ligne: string;
}

export interface NextPassage {
  published_line_name: string;
  destination_name: string;
  expected_arrival_time: string;
  expected_departure_time: string;
  delay?: number;
}

export interface Alert {
  id?: number;
  title: string;
  message: string;
  severity_type?: string;
  line_commercial_name?: string;
  start_time?: string;
  end_time?: string;
  affected_lines?: string[]; // Array of all affected line names
  lines_count?: number; // Number of affected lines
}