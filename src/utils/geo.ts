import { LatLng } from '../types';

const EARTH_RADIUS_MILES = 3958.8; // mean radius of Earth in miles

/**
 * Calculates distance between two coordinates in miles using Haversine formula
 */
export function haversineDistanceMiles(p1: LatLng, p2: LatLng): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculates cumulative length of a polyline in miles
 */
export function calculatePolylineLengthMiles(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistanceMiles(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Finds a point along a polyline at fraction t (0 <= t <= 1)
 */
export function interpolatePointAlongPath(points: LatLng[], fraction: number): LatLng {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const totalLength = calculatePolylineLengthMiles(points);

  if (totalLength === 0) {
    return points[0];
  }

  const targetDist = clampedFraction * totalLength;
  let accumulatedDist = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const segDist = haversineDistanceMiles(points[i], points[i + 1]);
    if (accumulatedDist + segDist >= targetDist || i === points.length - 2) {
      const segFraction = segDist > 0 ? (targetDist - accumulatedDist) / segDist : 0;
      const clampedSegFraction = Math.max(0, Math.min(1, segFraction));

      return {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * clampedSegFraction,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * clampedSegFraction,
      };
    }
    accumulatedDist += segDist;
  }

  return points[points.length - 1];
}

/**
 * Calculates polygon area in square miles using spherical excess / surveyor formula
 */
export function calculatePolygonAreaSqMiles(points: LatLng[]): number {
  if (points.length < 3) return 0;

  // Project points to local cartesian coordinates centered at average latitude
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const radLat = (avgLat * Math.PI) / 180;
  const cosLat = Math.cos(radLat);

  // 1 degree latitude in miles approx:
  const latMilesPerDeg = 69.0;
  // 1 degree longitude in miles approx:
  const lngMilesPerDeg = 69.17 * cosLat;

  // Shoelace formula in local miles
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = points[i].lng * lngMilesPerDeg;
    const yi = points[i].lat * latMilesPerDeg;
    const xj = points[j].lng * lngMilesPerDeg;
    const yj = points[j].lat * latMilesPerDeg;

    area += xi * yj - xj * yi;
  }

  const sqMiles = Math.abs(area) / 2;
  return Math.round(sqMiles * 100) / 100;
}
