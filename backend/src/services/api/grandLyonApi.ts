import axios, { AxiosInstance } from 'axios';

/**
 * Client pour l'API GrandLyon Data
 * Gère les différents formats: SIRI Lite 2.0, WFS (GeoServer), et REST JSON
 */
export class GrandLyonApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      headers: {
        'Authorization': `Basic ${process.env.TCL_API_TOKEN}`,
      },
      timeout: 30000, // 30 seconds timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
  }

  // SIRI Lite 2.0 - Données temps réel
  async getVehicleMonitoring() {
    const response = await this.client.get(
      'https://data.grandlyon.com/siri-lite/2.0/vehicle-monitoring.json'
    );
    return response.data.Siri?.ServiceDelivery?.VehicleMonitoringDelivery?.[0]?.VehicleActivity || [];
  }

  async getEstimatedTimetables() {
    const response = await this.client.get(
      'https://data.grandlyon.com/siri-lite/2.0/estimated-timetables.json'
    );
    return response.data.Siri?.ServiceDelivery?.EstimatedTimetableDelivery?.[0]?.EstimatedJourneyVersionFrame?.[0]?.EstimatedVehicleJourney || [];
  }

  // REST JSON - Alertes
  async getAlerts() {
    const response = await this.client.get(
      'https://data.grandlyon.com/fr/datapusher/ws/rdata/tcl_sytral.tclalertetrafic_2/all.json?maxfeatures=-1&start=1'
    );
    return response.data.values || [];
  }

  // WFS (GeoServer) - Données géographiques
  async getStations() {
    const response = await this.client.get(
      'https://data.grandlyon.com/geoserver/sytral/ows',
      {
        params: {
          SERVICE: 'WFS',
          VERSION: '2.0.0',
          request: 'GetFeature',
          typename: 'sytral:tcl_sytral.tclstation',
          outputFormat: 'application/json',
          SRSNAME: 'EPSG:4171',
        },
      }
    );
    return response.data.features || [];
  }

  async getStops() {
    const response = await this.client.get(
      'https://data.grandlyon.com/geoserver/sytral/ows',
      {
        params: {
          SERVICE: 'WFS',
          VERSION: '2.0.0',
          request: 'GetFeature',
          typename: 'sytral:tcl_sytral.tclarret',
          outputFormat: 'application/json',
          SRSNAME: 'EPSG:4171',
        },
      }
    );
    return response.data.features || [];
  }

  async getLines(category: 'bus' | 'metro' | 'tram' | 'rhonexpress') {
    const typeNames = {
      bus: 'sytral:tcl_sytral.tcllignebus_2_0_0',
      metro: 'sytral:tcl_sytral.tcllignemf_2_0_0',
      tram: 'sytral:tcl_sytral.tcllignetram_2_0_0',
      rhonexpress: 'sytral:rx_rhonexpress.rxligne_2_0_0',
    };

    const response = await this.client.get(
      'https://data.grandlyon.com/geoserver/sytral/ows',
      {
        params: {
          SERVICE: 'WFS',
          VERSION: '2.0.0',
          request: 'GetFeature',
          typename: typeNames[category],
          outputFormat: 'application/json',
          SRSNAME: 'EPSG:4171',
        },
      }
    );
    return response.data.features || [];
  }
}

export const grandLyonApi = new GrandLyonApiClient();
