import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  stopRepository,
  lineRepository,
  vehicleRepository,
  alertRepository,
  lineIconRepository,
} from '../database/repositories';
import { VehicleQueryParams } from '../types';

const router = Router();

// GET /api/stops - Get all stops with optional pagination
router.get(
  '/stops',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const stops = await stopRepository.findAll(limit, offset);

    // If pagination params provided, return with metadata
    if (limit !== undefined || offset !== undefined) {
      const total = await stopRepository.count();
      res.json({
        data: stops,
        pagination: {
          total,
          limit: limit || total,
          offset: offset || 0,
          hasMore: offset !== undefined && limit !== undefined ? (offset + limit) < total : false
        }
      });
    } else {
      // Backward compatibility: return just array if no pagination
      res.json(stops);
    }
  })
);

// GET /api/lines - Get all lines
router.get(
  '/lines',
  asyncHandler(async (req, res) => {
    const lines = await lineRepository.findAll();
    res.json(lines);
  })
);

// GET /api/vehicles - Get vehicle positions with optional filters
router.get(
  '/vehicles',
  asyncHandler(async (req, res) => {
    const params: VehicleQueryParams = {
      line_sort_code: req.query.line_sort_code as string,
      direction: req.query.direction as 'Aller' | 'Retour',
    };

    const vehicles = await vehicleRepository.findAll(params);
    res.json(vehicles);
  })
);

// GET /api/alerts - Get all traffic alerts with optional pagination
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const alerts = await alertRepository.findAll(limit, offset);

    // If pagination params provided, return with metadata
    if (limit !== undefined || offset !== undefined) {
      const total = await alertRepository.count();
      res.json({
        data: alerts,
        pagination: {
          total,
          limit: limit || total,
          offset: offset || 0,
          hasMore: offset !== undefined && limit !== undefined ? (offset + limit) < total : false
        }
      });
    } else {
      // Backward compatibility: return just array if no pagination
      res.json(alerts);
    }
  })
);

// GET /api/stops/:stop_id/next-passages - Get next passages for a stop
router.get(
  '/stops/:stop_id/next-passages',
  asyncHandler(async (req, res) => {
    const { stop_id } = req.params;
    const passages = await stopRepository.getNextPassages(stop_id);
    res.json(passages);
  })
);

// GET /api/line-icons - Get line icon mappings
router.get(
  '/line-icons',
  asyncHandler(async (req, res) => {
    const icons = await lineIconRepository.findAll();
    res.json(icons);
  })
);

export default router;
