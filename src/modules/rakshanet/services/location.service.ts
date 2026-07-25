import { Injectable } from "@nitrostack/core";
import { LocationInput, LocationResult, SafeHaven } from "../dto/location.dto.js";

@Injectable()
export class LocationService {

    assessLocation(input: LocationInput): LocationResult {

        const routeDeviation = this.checkRouteDeviation(input);
        const safeHavens = this.findSafeHavens(input);

        return {
            routeDeviation,
            nearestSafeHaven: safeHavens[0] ?? null,
            safeHavens,
        };
    }

    private checkRouteDeviation(input: LocationInput): boolean {
        if (!input.expectedRoute || input.expectedRoute.length === 0) {
            return false;
        }

        // Simple mock check for now: deviation if current point
        // is not close to any point on the expected route.
        const THRESHOLD_DEGREES = 0.01; // ~1km, rough placeholder

        const isNearRoute = input.expectedRoute.some((point) => {
            const distance = Math.sqrt(
                Math.pow(point.lat - input.lat, 2) +
                Math.pow(point.lng - input.lng, 2)
            );
            return distance <= THRESHOLD_DEGREES;
        });

        return !isNearRoute;
    }

    private findSafeHavens(input: LocationInput): SafeHaven[] {
        // Mock data for now — replace with real maps API later
        return [
            { type: "lit_street", name: "MG Road (well-lit)", distanceMeters: 90 },
            { type: "24_7_store", name: "QuickMart 24x7", distanceMeters: 180 },
            { type: "police_booth", name: "Sector 12 Police Booth", distanceMeters: 340 },
        ];
    }
}