import { RiskLevel } from "../types/risk.types.js";
import { ActionType } from "../types/action.types.js";

export interface ThreatInput {
    night: boolean;
    poorLighting: boolean;
    routeDeviation: boolean;
    audioThreat: number;

    // Optional — added for Location + Communication integration
    lat?: number;
    lng?: number;
    expectedRoute?: { lat: number; lng: number }[];
    toNumber?: string;
    guardianName?: string;
}

export interface ThreatResult {
    risk: number;
    level: RiskLevel;
    action: ActionType;
}