import axios from 'axios';
import { Pool } from 'pg';
import cron from 'node-cron';
import fs from 'fs';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const fetchAndStoreAlerts = async () => {
  try {
    const response = await axios.get('https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclalertetrafic_2/all.json?maxfeatures=-1&start=1', {
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
    });

    const alerts = response.data.values;



    for (const alert of alerts) {
      const {
        id, type, cause, date_debut, date_fin, mode, ligne_nom_commercial, ligne_nom_client, titre, message, date_modification, niveau_severite, type_severite, type_objet, liste_objet
      } = alert;

      const query = `
        INSERT INTO alerts (alert_id, type, cause, start_time, end_time, mode, line_commercial_name, line_customer_name, title, message, last_update, severity_type, severity_level, object_type, object_list)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (alert_id) DO UPDATE SET
          type = EXCLUDED.type,
          cause = EXCLUDED.cause,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          mode = EXCLUDED.mode,
          line_commercial_name = EXCLUDED.line_commercial_name,
          line_customer_name = EXCLUDED.line_customer_name,
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          last_update = EXCLUDED.last_update,
          severity_type = EXCLUDED.severity_type,
          severity_level = EXCLUDED.severity_level,
          object_type = EXCLUDED.object_type,
          object_list = EXCLUDED.object_list;
      `;

      const values = [
        id, type, cause, date_debut, date_fin, mode, ligne_nom_commercial, ligne_nom_client, titre, message, date_modification, type_severite, niveau_severite, type_objet, liste_objet
      ];

      await pool.query(query, values);
    }
    console.log('Successfully fetched and stored alerts.');
  } catch (error) {
    console.error('Error fetching and storing alerts:', error);
  }
};

const fetchAndStoreStations = async () => {
  try {
    const response = await axios.get('https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclstation&outputFormat=application/json&SRSNAME=EPSG:4171', {
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
    });

    const features = response.data.features;



    for (const feature of features) {
      const properties = feature.properties;
      const id = feature.id;
      const {
        station_api_id, nom, desserte, last_update
      } = properties;
      const [longitude, latitude] = feature.geometry.coordinates;

      const query = `
        INSERT INTO stations (id, station_api_id, name, service_info, last_update, longitude, latitude, station_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          station_api_id = EXCLUDED.station_api_id,
          name = EXCLUDED.name,
          service_info = EXCLUDED.service_info,
          last_update = EXCLUDED.last_update,
          longitude = EXCLUDED.longitude,
          latitude = EXCLUDED.latitude,
          station_id = EXCLUDED.station_id;
      `;

      const values = [
        id, station_api_id, nom, desserte, last_update, longitude, latitude, station_api_id
      ];

      await pool.query(query, values);
    }
    console.log('Successfully fetched and stored stations.');
  } catch (error) {
    console.error('Error fetching and storing stations:', error);
  }
};

const fetchAndStoreLines = async (url: string, category: string) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
    });

    const features = response.data.features;



    for (const feature of features) {
      const properties = feature.properties;
      const geometry = feature.geometry;
      const id = feature.id;
      const {
        code_ligne, nom_trace, ligne, last_update, couleur,
        type_trace, sens, origine, destination, nom_origine, nom_destination, famille_transport, date_debut, date_fin, code_type_ligne, nom_type_ligne, pmr, nom_version
      } = properties;

      const formattedColor = couleur ? `rgb(${couleur.split(' ').join(', ')})` : null;

      const query = `
        INSERT INTO lines (id, line_name, trace_code, line_code, trace_type, trace_name, direction, origin_id, destination_id, origin_name, destination_name, transport_family, start_date, end_date, line_type_code, line_type_name, pmr_accessible, line_sort_code, version_name, last_update, category, color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (id) DO UPDATE SET
          line_name = EXCLUDED.line_name,
          trace_code = EXCLUDED.trace_code,
          line_code = EXCLUDED.line_code,
          trace_type = EXCLUDED.trace_type,
          trace_name = EXCLUDED.trace_name,
          direction = EXCLUDED.direction,
          origin_id = EXCLUDED.origin_id,
          destination_id = EXCLUDED.destination_id,
          origin_name = EXCLUDED.origin_name,
          destination_name = EXCLUDED.destination_name,
          transport_family = EXCLUDED.transport_family,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          line_type_code = EXCLUDED.line_type_code,
          line_type_name = EXCLUDED.line_type_name,
          pmr_accessible = EXCLUDED.pmr_accessible,
          line_sort_code = EXCLUDED.line_sort_code,
          version_name = EXCLUDED.version_name,
          last_update = EXCLUDED.last_update,
          category = EXCLUDED.category,
          color = EXCLUDED.color;
      `;

      const values = [
        id, nom_trace, JSON.stringify(geometry), code_ligne, type_trace, nom_trace, sens, origine, destination, nom_origine, nom_destination, famille_transport, date_debut, date_fin, code_type_ligne, nom_type_ligne, pmr, ligne, nom_version, last_update, category, formattedColor
      ];

      await pool.query(query, values);
    }
    console.log(`Successfully fetched and stored ${category} lines.`);
  } catch (error) {
    console.error(`Error fetching and storing ${category} lines:`, error);
  }
};

const fetchAndStoreStops = async () => {
  try {
    const response = await axios.get('https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tclarret&outputFormat=application/json&SRSNAME=EPSG:4171', {
        headers: {
            'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
        },
    });

    const features = response.data.features;



    for (const feature of features) {
      const properties = feature.properties;
      const id = feature.id;
      const {
        nom, desserte, pmr, ascenseur, escalier, last_update, adresse, commune, zone
      } = properties;
      const [longitude, latitude] = feature.geometry.coordinates;


      const gtfsStopId = id.split('.').pop() ?? ''; // Correctly extract numeric ID

      const query = `
        INSERT INTO stops (id, name, service_info, pmr_accessible, has_elevator, has_escalator, last_update, address, municipality, zone, longitude, latitude, gtfs_stop_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          service_info = EXCLUDED.service_info,
          pmr_accessible = EXCLUDED.pmr_accessible,
          has_elevator = EXCLUDED.has_elevator,
          has_escalator = EXCLUDED.has_escalator,
          last_update = EXCLUDED.last_update,
          address = EXCLUDED.address,
          municipality = EXCLUDED.municipality,
          zone = EXCLUDED.zone,
          longitude = EXCLUDED.longitude,
          latitude = EXCLUDED.latitude,
          gtfs_stop_id = EXCLUDED.gtfs_stop_id;
      `;

      const values = [
        id, nom, desserte, pmr, ascenseur, escalier, last_update, adresse, commune, zone, longitude, latitude, gtfsStopId
      ];

      await pool.query(query, values);
    }
    console.log('Successfully fetched and stored stops.');
  } catch (error) {
    console.error('Error fetching and storing stops:', error);
  }
};

let isIngestingTimetables = false;

const fetchAndStoreEstimatedTimetables = async () => {
  if (isIngestingTimetables) {
    // console.log('Skipping timetable ingestion, already in progress.');
    return;
  }
  isIngestingTimetables = true;
  try {
    // Purge existing estimated calls and journeys before inserting new data
    await pool.query('DELETE FROM estimated_calls;');
    await pool.query('DELETE FROM estimated_vehicle_journeys;');

    const response = await axios.get('https://data.grandlyon.com/siri-lite/2.0/estimated-timetables.json', {
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
    });

    if (response.data.Siri.ServiceDelivery.EstimatedTimetableDelivery && response.data.Siri.ServiceDelivery.EstimatedTimetableDelivery.length > 0) {
      const estimatedJourneys = response.data.Siri.ServiceDelivery.EstimatedTimetableDelivery[0].EstimatedJourneyVersionFrame[0].EstimatedVehicleJourney;
      // console.log('Estimated Journeys count:', estimatedJourneys ? estimatedJourneys.length : 0);

      for (const journey of estimatedJourneys) {
        // console.log('Processing journey:', journey.DatedVehicleJourneyRef?.value);
        const {
          LineRef,
          DirectionRef,
          DatedVehicleJourneyRef,
          EstimatedCalls,
          DestinationRef
        } = journey;

        const journeyQuery = `
          INSERT INTO estimated_vehicle_journeys (line_ref, direction_ref, dated_vehicle_journey_ref, destination_ref)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (dated_vehicle_journey_ref) DO UPDATE SET
            line_ref = EXCLUDED.line_ref,
            direction_ref = EXCLUDED.direction_ref,
            destination_ref = EXCLUDED.destination_ref
          RETURNING id;
        `;
        const journeyValues = [LineRef?.value, DirectionRef?.value, DatedVehicleJourneyRef?.value, DestinationRef?.value];
        // console.log('Inserting into estimated_vehicle_journeys with values:', journeyValues);
        const { rows: journeyRows } = await pool.query(journeyQuery, journeyValues);
        const journeyId = journeyRows[0].id;
        // console.log('Generated journeyId:', journeyId);

        if (journey.EstimatedCalls && journey.EstimatedCalls.EstimatedCall) {
          // console.log('Estimated Calls count for journey:', journey.DatedVehicleJourneyRef?.value, journey.EstimatedCalls.EstimatedCall.length);
          for (const call of journey.EstimatedCalls.EstimatedCall) {
            const {
              StopPointRef,
              Order,
              AimedArrivalTime,
              ExpectedArrivalTime,
              AimedDepartureTime,
              ExpectedDepartureTime,
            } = call;

            const callQuery = `
              INSERT INTO estimated_calls (estimated_vehicle_journey_id, stop_point_ref, gtfs_stop_id, stop_order, aimed_arrival_time, expected_arrival_time, aimed_departure_time, expected_departure_time)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (estimated_vehicle_journey_id, stop_order) DO NOTHING;
            `;

            const gtfsStopId = StopPointRef?.value.split(':')[3]; // Extract numeric ID
            const callValues = [
              journeyId,
              StopPointRef?.value,
              gtfsStopId,
              Order,
              AimedArrivalTime,
              ExpectedArrivalTime ?? AimedArrivalTime,
              AimedDepartureTime,
              ExpectedDepartureTime,
            ];
            // console.log('Inserting into estimated_calls with values:', callValues);
            await pool.query(callQuery, callValues);
          }
        }
      }
    }
    console.log('Successfully fetched and stored estimated timetables.');
  } catch (error) {
    console.error('Error fetching and storing estimated timetetables:', error);
  } finally {
    isIngestingTimetables = false;
  }
};

const fetchAndStoreLineIconsMapping = async () => {
  try {
    const csvFilePath = './Liste_pictogrammes_lignes.csv';
    const csvContent = await fs.promises.readFile(csvFilePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      let [code_ligne, picto_mode, picto_ligne_raw] = lines[i].split(';');
      // Ensure the picto_ligne has a .png extension
      const picto_ligne = picto_ligne_raw.replace(/\.svg$/, '.png');

      const query = `
        INSERT INTO line_icon_mapping (code_ligne, picto_mode, picto_ligne)
        VALUES ($1, $2, $3)
        ON CONFLICT (code_ligne) DO UPDATE SET
          picto_mode = EXCLUDED.picto_mode,
          picto_ligne = EXCLUDED.picto_ligne;
      `;

      const values = [code_ligne, picto_mode, picto_ligne];
      await pool.query(query, values);
    }
  } catch (error) {
    console.error('Error fetching and storing line icon mappings:', error);
  }
};

const fetchAndStoreVehiclePositions = async () => {
  try {
    // Purge existing vehicle positions before inserting new data
    await pool.query('DELETE FROM vehicle_positions;');

    const response = await axios.get('https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json', {
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
    });


    if (response.data.Siri.ServiceDelivery.VehicleMonitoringDelivery && response.data.Siri.ServiceDelivery.VehicleMonitoringDelivery.length > 0) {
      const vehicleActivities = response.data.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity;



      if (vehicleActivities && Array.isArray(vehicleActivities)) {
        for (const activity of vehicleActivities) {
          const {
            RecordedAtTime,
            ValidUntilTime,
            MonitoredVehicleJourney,
          } = activity;

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

          const query = `
            INSERT INTO vehicle_positions (vehicle_ref, recorded_at_time, valid_until_time, line_ref, direction_ref, dated_vehicle_journey_ref, published_line_name, direction_name, operator_ref, destination_ref, destination_name, longitude, latitude, bearing, delay, stop_point_ref, stop_point_name, aimed_arrival_time, expected_arrival_time, aimed_departure_time, expected_departure_time, distance_from_stop, stop_order)
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
            VehicleRef?.value,
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

          await pool.query(query, values);
        }
      }
    }
    console.log('Successfully fetched and stored vehicle positions.');
  } catch (error) {
    console.error('Error fetching and storing vehicle positions:', error);
  }
};

export const startIngestionService = () => {
  const lineUrls = {
    bus: "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignebus_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
    metro: "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignemf_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
    tram: "https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:tcl_sytral.tcllignetram_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171",
    rhonexpress: 'https://data.grandlyon.com/geoserver/sytral/ows?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=sytral:rx_rhonexpress.rxligne_2_0_0&outputFormat=application/json&SRSNAME=EPSG:4171',
  };

  // Immediately run once on startup
  fetchAndStoreAlerts();
  fetchAndStoreStations();
  for (const [category, url] of Object.entries(lineUrls)) {
    fetchAndStoreLines(url, category);
  }
  fetchAndStoreStops();
  fetchAndStoreEstimatedTimetables();
  fetchAndStoreVehiclePositions();
  fetchAndStoreLineIconsMapping();

  // Schedule to run every 15 minutes for static data
  cron.schedule('*/15 * * * *', () => {
    fetchAndStoreAlerts();
    fetchAndStoreStations();
    for (const [category, url] of Object.entries(lineUrls)) {
      fetchAndStoreLines(url, category);
    }
    fetchAndStoreStops();
    fetchAndStoreLineIconsMapping();
  });

  // Schedule to run every 5 seconds for real-time data
  cron.schedule('*/5 * * * * *', () => {
    fetchAndStoreEstimatedTimetables();
    fetchAndStoreVehiclePositions();
  });
};