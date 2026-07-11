use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct AlertsResponse {
    pub values: Vec<AlertRecord>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct AlertRecord {
    #[serde(rename = "n")]
    pub n: Option<i64>,
    #[serde(rename = "type")]
    pub alert_type: Option<String>,
    pub cause: Option<String>,
    pub debut: Option<String>,
    pub fin: Option<String>,
    pub mode: Option<String>,
    pub ligne_com: Option<String>,
    pub ligne_cli: Option<String>,
    pub titre: Option<String>,
    pub message: Option<String>,
    pub last_update_fme: Option<String>,
    pub niveauseverite: Option<i64>,
    pub typeseverite: Option<String>,
    pub typeobjet: Option<String>,
    pub listeobjet: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct GeoFeatureCollection<T> {
    pub features: Vec<GeoFeature<T>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct GeoFeature<T> {
    pub id: String,
    pub properties: T,
    pub geometry: GeoGeometry,
}

#[derive(Deserialize, Debug, Clone)]
pub struct GeoFeatureCollectionAnyGeom<T> {
    pub features: Vec<GeoFeatureAnyGeom<T>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct GeoFeatureAnyGeom<T> {
    pub id: String,
    pub properties: T,
    pub geometry: serde_json::Value,
}

#[derive(Deserialize, serde::Serialize, Debug, Clone)]
pub struct GeoGeometry {
    pub coordinates: Vec<f64>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct StationProperties {
    pub station_api_id: Option<i64>,
    pub nom: Option<String>,
    pub desserte: Option<String>,
    pub last_update: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct StopProperties {
    pub nom: Option<String>,
    pub desserte: Option<String>,
    pub pmr: Option<bool>,
    pub ascenseur: Option<bool>,
    pub escalier: Option<bool>,
    pub last_update: Option<String>,
    pub adresse: Option<String>,
    pub commune: Option<String>,
    pub zone: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct LineProperties {
    pub code_ligne: Option<String>,
    pub nom_trace: Option<String>,
    pub ligne: Option<String>,
    pub last_update: Option<String>,
    pub couleur: Option<String>,
    pub type_trace: Option<String>,
    pub sens: Option<String>,
    pub origine: Option<String>,
    pub destination: Option<String>,
    pub nom_origine: Option<String>,
    pub nom_destination: Option<String>,
    pub famille_transport: Option<String>,
    pub date_debut: Option<String>,
    pub date_fin: Option<String>,
    pub code_type_ligne: Option<String>,
    pub nom_type_ligne: Option<String>,
    pub pmr: Option<bool>,
    pub nom_version: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriVehicleMonitoringResponse {
    #[serde(rename = "Siri")]
    pub siri: Option<SiriService>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedTimetablesResponse {
    #[serde(rename = "Siri")]
    pub siri: Option<SiriService>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriService {
    #[serde(rename = "ServiceDelivery")]
    pub service_delivery: Option<SiriServiceDelivery>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriServiceDelivery {
    #[serde(rename = "VehicleMonitoringDelivery")]
    pub vehicle_monitoring_delivery: Option<Vec<SiriVehicleMonitoringDelivery>>,
    #[serde(rename = "EstimatedTimetableDelivery")]
    pub estimated_timetable_delivery: Option<Vec<SiriEstimatedTimetableDelivery>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriVehicleMonitoringDelivery {
    #[serde(rename = "VehicleActivity")]
    pub vehicle_activity: Option<Vec<SiriVehicleActivity>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedTimetableDelivery {
    #[serde(rename = "EstimatedJourneyVersionFrame")]
    pub estimated_journey_version_frame: Option<Vec<SiriEstimatedJourneyFrame>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedJourneyFrame {
    #[serde(rename = "EstimatedVehicleJourney")]
    pub estimated_vehicle_journey: Option<Vec<SiriEstimatedVehicleJourney>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriValue {
    pub value: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriVehicleActivity {
    #[serde(rename = "RecordedAtTime")]
    pub recorded_at_time: Option<String>,
    #[serde(rename = "ValidUntilTime")]
    pub valid_until_time: Option<String>,
    #[serde(rename = "MonitoredVehicleJourney")]
    pub monitored_vehicle_journey: SiriMonitoredVehicleJourney,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriMonitoredVehicleJourney {
    #[serde(rename = "LineRef")]
    pub line_ref: Option<SiriValue>,
    #[serde(rename = "DirectionRef")]
    pub direction_ref: Option<SiriValue>,
    #[serde(rename = "FramedVehicleJourneyRef")]
    pub framed_vehicle_journey_ref: Option<SiriFramedVehicleJourneyRef>,
    #[serde(rename = "PublishedLineName")]
    pub published_line_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "DirectionName")]
    pub direction_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "OperatorRef")]
    pub operator_ref: Option<SiriValue>,
    #[serde(rename = "DestinationRef")]
    pub destination_ref: Option<SiriValue>,
    #[serde(rename = "DestinationName")]
    pub destination_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "VehicleLocation")]
    pub vehicle_location: Option<SiriVehicleLocation>,
    #[serde(rename = "Bearing")]
    pub bearing: Option<f64>,
    #[serde(rename = "Velocity")]
    pub velocity: Option<f64>,
    #[serde(rename = "Occupancy")]
    pub occupancy: Option<String>,
    #[serde(rename = "Delay")]
    pub delay: Option<String>,
    #[serde(rename = "VehicleRef")]
    pub vehicle_ref: Option<SiriValue>,
    #[serde(rename = "MonitoredCall")]
    pub monitored_call: Option<SiriMonitoredCall>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriFramedVehicleJourneyRef {
    #[serde(rename = "DatedVehicleJourneyRef")]
    pub dated_vehicle_journey_ref: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriVehicleLocation {
    #[serde(rename = "Longitude")]
    pub longitude: Option<f64>,
    #[serde(rename = "Latitude")]
    pub latitude: Option<f64>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriMonitoredCall {
    #[serde(rename = "StopPointRef")]
    pub stop_point_ref: Option<SiriValue>,
    #[serde(rename = "StopPointName")]
    pub stop_point_name: Option<Vec<SiriValue>>, 
    #[serde(rename = "AimedArrivalTime")]
    pub aimed_arrival_time: Option<String>,
    #[serde(rename = "ExpectedArrivalTime")]
    pub expected_arrival_time: Option<String>,
    #[serde(rename = "AimedDepartureTime")]
    pub aimed_departure_time: Option<String>,
    #[serde(rename = "ExpectedDepartureTime")]
    pub expected_departure_time: Option<String>,
    #[serde(rename = "DistanceFromStop")]
    pub distance_from_stop: Option<i64>,
    #[serde(rename = "Order")]
    pub order: Option<i64>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedVehicleJourney {
    #[serde(rename = "LineRef")]
    pub LineRef: Option<SiriValue>,
    #[serde(rename = "DirectionRef")]
    pub DirectionRef: Option<SiriValue>,
    #[serde(rename = "DatedVehicleJourneyRef")]
    pub DatedVehicleJourneyRef: Option<SiriValue>,
    #[serde(rename = "FramedVehicleJourneyRef")]
    pub FramedVehicleJourneyRef: Option<SiriFramedVehicleJourneyRef>,
    #[serde(rename = "DestinationRef")]
    pub DestinationRef: Option<SiriValue>,
    #[serde(rename = "EstimatedCalls")]
    pub EstimatedCalls: Option<SiriEstimatedCalls>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedCalls {
    #[serde(rename = "EstimatedCall")]
    pub EstimatedCall: Option<Vec<SiriEstimatedCall>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SiriEstimatedCall {
    #[serde(rename = "StopPointRef")]
    pub StopPointRef: Option<SiriValue>,
    #[serde(rename = "Order")]
    pub Order: Option<i64>,
    #[serde(rename = "AimedArrivalTime")]
    pub AimedArrivalTime: Option<String>,
    #[serde(rename = "ExpectedArrivalTime")]
    pub ExpectedArrivalTime: Option<String>,
    #[serde(rename = "AimedDepartureTime")]
    pub AimedDepartureTime: Option<String>,
    #[serde(rename = "ExpectedDepartureTime")]
    pub ExpectedDepartureTime: Option<String>,
}
