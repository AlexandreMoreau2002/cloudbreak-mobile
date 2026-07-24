/**
 * useTerrainAutoDetect — détecte la proximité GPS d'un sommet consulté
 * pendant que l'app est au premier plan, sans dépendre des notifications
 * push (Epic 5, bloqué).
 *
 * Usage :
 *   useTerrainAutoDetect({ locationPermission, target, onNear });
 */
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { DEBUG } from '@/constants/devConfig';
import type { LocationPermissionStatus } from '@/contexts/AuthContext';

const NEAR_RADIUS_METERS = 500;
const DISTANCE_INTERVAL_METERS = 50;
const TIME_INTERVAL_MS = 30000;
const EARTH_RADIUS_METERS = 6371000;

interface TargetCoords {
  lat: number;
  lng: number;
}

interface UseTerrainAutoDetectArgs {
  locationPermission: LocationPermissionStatus;
  target: TargetCoords | null;
  onNear: () => void;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(a: TargetCoords, b: TargetCoords): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function useTerrainAutoDetect({ locationPermission, target, onNear }: UseTerrainAutoDetectArgs) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    hasFiredRef.current = false;

    if (locationPermission !== 'granted' || !target) {
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    Location.watchPositionAsync(
      { distanceInterval: DISTANCE_INTERVAL_METERS, timeInterval: TIME_INTERVAL_MS },
      (position) => {
        if (cancelled || hasFiredRef.current) return;
        const distance = haversineDistanceMeters(target, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        if (DEBUG) console.debug('[useTerrainAutoDetect] distance', { distance });
        if (distance < NEAR_RADIUS_METERS) {
          hasFiredRef.current = true;
          onNear();
        }
      },
    ).then((sub) => {
      if (cancelled) {
        sub.remove();
        return;
      }
      subscription = sub;
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [locationPermission, target, onNear]);
}
