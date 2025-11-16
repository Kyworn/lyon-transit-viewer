/**
 * Geographic utility functions for distance and bearing calculations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance of a path given coordinates
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Total distance in meters
 */
export function calculatePathDistance(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return totalDistance;
}

/**
 * Calculate bearing (direction) between two points
 * @param lat1 Latitude of start point
 * @param lon1 Longitude of start point
 * @param lat2 Latitude of end point
 * @param lon2 Longitude of end point
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Get compass direction from bearing
 * @param bearing Bearing in degrees
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "250 m" or "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 * @param ms Duration in milliseconds
 * @returns Formatted string (e.g., "5 min" or "1h 15min")
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes} min`;
}

/**
 * Get walking instructions based on section data
 * @param section Journey section with geojson
 * @param toName Destination name
 * @returns Instruction string
 */
export function getWalkingInstructions(
  section: { geojson?: { coordinates: number[][] }; to: { name: string } }
): string {
  if (!section.geojson?.coordinates || section.geojson.coordinates.length < 2) {
    return `Marcher jusqu'à ${section.to.name}`;
  }

  const distance = calculatePathDistance(section.geojson.coordinates);
  const [lon1, lat1] = section.geojson.coordinates[0];
  const [lon2, lat2] = section.geojson.coordinates[section.geojson.coordinates.length - 1];
  const bearing = calculateBearing(lat1, lon1, lat2, lon2);
  const direction = getCompassDirection(bearing);

  const formattedDistance = formatDistance(distance);

  let text = 'vers';
  switch (direction) {
    case 'N':
      text = 'vers le nord';
      break;
    case 'NE':
      text = 'vers le nord-est';
      break;
    case 'E':
      text = 'vers l\'est';
      break;
    case 'SE':
      text = 'vers le sud-est';
      break;
    case 'S':
      text = 'vers le sud';
      break;
    case 'SW':
      text = 'vers le sud-ouest';
      break;
    case 'W':
      text = 'vers l\'ouest';
      break;
    case 'NW':
      text = 'vers le nord-ouest';
      break;
  }

  return `Marcher ${formattedDistance} ${text} jusqu'à ${section.to.name}`;
}
