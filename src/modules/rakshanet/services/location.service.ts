/**
 * services/location.service.ts
 *
 * RakshaNet — LocationService
 * ----------------------------------------------------------------------
 * Finds nearby "safe places" (police stations, hospitals, fire stations,
 * etc.) for a given latitude/longitude.
 *
 * Design notes:
 *  - This service is provider-agnostic. It talks to an internal
 *    `LocationProvider` interface, not to Google Maps / OSM directly.
 *  - Today, only a `MockLocationProvider` exists, so the hackathon demo
 *    works with zero external API keys or network calls.
 *  - When a real Maps API key is available (checked via env var), swap
 *    in a `GoogleMapsLocationProvider` (or `OsmLocationProvider`) that
 *    implements the same interface — `LocationService`'s public API
 *    (`findSafeLocations`, `findNearestPoliceStation`,
 *    `findNearestHospital`) does not need to change at all.
 *  - Distance is always computed/verified locally via the Haversine
 *    formula, so results are consistently sorted nearest-first
 *    regardless of which provider supplied the raw points.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Coordinates,
  LocationType,
  SafeLocation,
} from '../types/location.types';

/**
 * Contract any location data source (mock, Google Maps, OSM, ...) must
 * satisfy. Keeping this narrow makes it trivial to swap implementations
 * later without touching `LocationService`'s public methods.
 */
interface LocationProvider {
  /**
   * Return raw candidate locations of the given type near the given
   * coordinates. Distance/sorting is handled by `LocationService`
   * itself, so providers only need to supply position + metadata.
   */
  fetchLocations(
    coordinates: Coordinates,
    type: LocationType,
  ): Promise<Omit<SafeLocation, 'distance' | 'estimatedTime'>[]>;
}

/**
 * Generates realistic-looking mock locations scattered a few hundred
 * meters to a few kilometers around the query point, so demo results
 * always look plausible no matter where the user "is" during a demo.
 */
class MockLocationProvider implements LocationProvider {
  // Name pools per location type — cycled through deterministically so
  // repeated calls for the same point return stable results.
  private readonly namePools: Record<LocationType, string[]> = {
    'Police Station': [
      'Anna Nagar Police Station',
      'T. Nagar Police Station',
      'Adyar Police Station',
      'Central Police Outpost',
    ],
    Hospital: [
      'Apollo Hospital',
      'Fortis Malar Hospital',
      'Government General Hospital',
      'Kauvery Hospital',
    ],
    'Fire Station': [
      'City Fire & Rescue Station',
      'Municipal Fire Station',
      'District Fire Services Unit',
    ],
    'Safe Zone': [
      'Community Safe Point',
      'Public Safety Kiosk',
      'Neighborhood Watch Center',
    ],
    'Women Help Center': [
      'All Women Police Station',
      'District Women Help Center',
      'One Stop Crisis Center',
    ],
  };

  async fetchLocations(
    coordinates: Coordinates,
    type: LocationType,
  ): Promise<Omit<SafeLocation, 'distance' | 'estimatedTime'>[]> {
    const names = this.namePools[type] ?? [];

    return names.map((name, index) => {
      // Small deterministic offset (~0.2km to ~1.2km) per entry so mock
      // points fan out around the user instead of stacking on one spot.
      const offset = (index + 1) * 0.003; // ~0.3km per step in degrees
      const angle = (index * 47) % 360; // spread points around a circle
      const radians = (angle * Math.PI) / 180;

      return {
        id: `${type}-${index + 1}`.replace(/\s+/g, '-').toLowerCase(),
        name,
        type,
        latitude: coordinates.latitude + offset * Math.cos(radians),
        longitude: coordinates.longitude + offset * Math.sin(radians),
      };
    });
  }
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly provider: LocationProvider;

  constructor() {
    // Provider selection: if a real Maps API key is configured, this is
    // the single place to swap `MockLocationProvider` for a real one,
    // e.g.:
    //
    //   this.provider = process.env.GOOGLE_MAPS_API_KEY
    //     ? new GoogleMapsLocationProvider(process.env.GOOGLE_MAPS_API_KEY)
    //     : new MockLocationProvider();
    //
    // For now, no external key is wired up, so we always use mock data
    // and log that fact once so it's obvious during a demo/debug session.
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      this.logger.warn(
        'No GOOGLE_MAPS_API_KEY configured — LocationService is using mock data.',
      );
    }
    this.provider = new MockLocationProvider();
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  /**
   * Find nearby safe places of all known types around the given point,
   * sorted nearest-first.
   *
   * @param latitude   User's latitude
   * @param longitude  User's longitude
   * @param limit      Optional cap on number of results returned (default: all)
   */
  async findSafeLocations(
    latitude: number,
    longitude: number,
    limit?: number,
  ): Promise<SafeLocation[]> {
    const coordinates = this.assertValidCoordinates(latitude, longitude);

    const types: LocationType[] = [
      'Police Station',
      'Hospital',
      'Fire Station',
      'Safe Zone',
      'Women Help Center',
    ];

    try {
      const resultsByType = await Promise.all(
        types.map((type) => this.fetchAndEnrich(coordinates, type)),
      );

      const merged = resultsByType.flat().sort((a, b) => a.distance - b.distance);

      return typeof limit === 'number' ? merged.slice(0, limit) : merged;
    } catch (error) {
      this.logger.error('Failed to fetch safe locations', error as Error);
      throw new Error('Unable to retrieve safe locations at this time.');
    }
  }

  /**
   * Find the single nearest police station to the given point.
   */
  async findNearestPoliceStation(
    latitude: number,
    longitude: number,
  ): Promise<SafeLocation> {
    return this.findNearestOfType(latitude, longitude, 'Police Station');
  }

  /**
   * Find the single nearest hospital to the given point.
   */
  async findNearestHospital(
    latitude: number,
    longitude: number,
  ): Promise<SafeLocation> {
    return this.findNearestOfType(latitude, longitude, 'Hospital');
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  /**
   * Shared logic for "nearest single location of a given type" — used by
   * both `findNearestPoliceStation` and `findNearestHospital` to avoid
   * duplicating validation/error handling.
   */
  private async findNearestOfType(
    latitude: number,
    longitude: number,
    type: LocationType,
  ): Promise<SafeLocation> {
    const coordinates = this.assertValidCoordinates(latitude, longitude);

    try {
      const candidates = await this.fetchAndEnrich(coordinates, type);

      if (candidates.length === 0) {
        throw new Error(`No ${type.toLowerCase()} found near the given location.`);
      }

      // Already enriched with distance; just take the closest.
      return candidates.sort((a, b) => a.distance - b.distance)[0];
    } catch (error) {
      this.logger.error(`Failed to fetch nearest ${type}`, error as Error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to retrieve nearest ${type.toLowerCase()}.`);
    }
  }

  /**
   * Fetch raw candidates from the active provider and enrich them with
   * computed distance + a rough estimated travel time.
   */
  private async fetchAndEnrich(
    coordinates: Coordinates,
    type: LocationType,
  ): Promise<SafeLocation[]> {
    const rawLocations = await this.provider.fetchLocations(coordinates, type);

    return rawLocations.map((location) => {
      const distance = this.calculateHaversineDistance(coordinates, {
        latitude: location.latitude,
        longitude: location.longitude,
      });

      return {
        ...location,
        distance: Math.round(distance * 10) / 10, // round to 1 decimal (km)
        estimatedTime: this.estimateTravelTime(distance),
      };
    });
  }

  /**
   * Haversine formula — great-circle distance between two lat/lng points
   * on Earth, in kilometers. This is the standard approach for
   * "as the crow flies" distance and is accurate enough for sorting
   * nearby points (it does not account for actual road routes).
   */
  private calculateHaversineDistance(
    from: Coordinates,
    to: Coordinates,
  ): number {
    const EARTH_RADIUS_KM = 6371;

    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Very rough estimated travel time based on distance, assuming an
   * average urban travel speed (~20 km/h, accounting for traffic/signals).
   * This is a placeholder heuristic — a real Maps provider would return
   * an actual ETA from its routing API instead.
   */
  private estimateTravelTime(distanceKm: number): string {
    const AVERAGE_SPEED_KMH = 20;
    const minutes = Math.max(1, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60));
    return `${minutes} min`;
  }

  /**
   * Validate that the given latitude/longitude form a real coordinate
   * pair before doing any work with them. Throwing early here means
   * bad input from an MCP tool or upstream caller fails fast with a
   * clear message instead of silently producing nonsense distances.
   */
  private assertValidCoordinates(
    latitude: number,
    longitude: number,
  ): Coordinates {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      throw new BadRequestException('Latitude and longitude must be valid numbers.');
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90.');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180.');
    }

    return { latitude, longitude };
  }
}