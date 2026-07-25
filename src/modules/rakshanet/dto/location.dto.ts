export interface RoutePoint {
    lat: number;
    lng: number;
}

export interface LocationInput {
    lat: number;
    lng: number;
    expectedRoute?: RoutePoint[];
}

export interface SafeHaven {
    type: string;
    name: string;
    distanceMeters: number;
}

export interface LocationResult {
    routeDeviation: boolean;
    nearestSafeHaven: SafeHaven | null;
    safeHavens: SafeHaven[];
}