import { Router } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { apiLogger } from '../utils/logger';

const router = Router();

const TCL_API_BASE = 'https://carte-interactive.tcl.fr/api/interface/tcl';

// GET /api/tcl/pricing-zones - Get pricing zones polygons
router.get(
  '/pricing-zones',
  asyncHandler(async (req, res) => {
    try {
      const response = await axios.get(`${TCL_API_BASE}/pois/by-type/pricing-zones`);
      res.json(response.data);
    } catch (error: any) {
      apiLogger.error('Failed to fetch pricing zones', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch pricing zones' });
    }
  })
);

// GET /api/tcl/journey - Calculate journey between two points
router.get(
  '/journey',
  asyncHandler(async (req, res) => {
    const {
      fromLat, fromLng, toLat, toLng,
      datetime, isArrivalTime, transportModes,
      walk, bike, pmr, car, dataFreshness
    } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: 'Missing required parameters: fromLat, fromLng, toLat, toLng' });
    }

    // Build query params
    const modes = transportModes || '["metro","funicular","tramway","boat","bus","tod","train","car-region"]';
    const dateTime = datetime || new Date().toISOString();
    const isPmr = pmr === 'true' ? 1 : 0;
    const isArrival = isArrivalTime === '1' ? '1' : '0';
    const walkSpeed = walk || 'normal';
    const carEnabled = car || '1';
    const freshness = dataFreshness || '0';

    const paramsObj: Record<string, string> = {
      from: JSON.stringify({ lat: parseFloat(fromLat as string), lng: parseFloat(fromLng as string) }),
      to: JSON.stringify({ lat: parseFloat(toLat as string), lng: parseFloat(toLng as string) }),
      datetime: dateTime as string,
      isArrivalTime: isArrival,
      transportModes: modes as string,
      walk: walkSpeed as string,
      pmr: isPmr.toString(),
      language: 'fr',
      car: carEnabled as string,
      dataFreshness: freshness as string
    };

    // Only add bike parameter if provided (when bike mode is enabled)
    if (bike) {
      paramsObj.bike = bike as string;
    }

    const params = new URLSearchParams(paramsObj);

    try {
      const url = `${TCL_API_BASE}/journeys?${params.toString()}`;
      apiLogger.info('Requesting TCL journey', { url });

      const response = await axios.get(url);

      // TCL API returns {ok: false, err: "..."} on error
      // or {data: {journeys: [...]}} on success (no "ok" field)
      if (response.data.ok === false) {
        apiLogger.error('TCL API returned error', {
          error: response.data.err
        });
        return res.status(400).json({ error: response.data.err || 'Unknown TCL API error' });
      }

      // Success case: return the data
      res.json(response.data.data);
    } catch (error: any) {
      apiLogger.error('Failed to calculate journey', { error: error.message, response: error.response?.data });
      res.status(500).json({ error: 'Failed to calculate journey: ' + error.message });
    }
  })
);

export default router;
