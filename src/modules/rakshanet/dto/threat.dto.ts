import { RiskLevel } from "../types/risk.types.js";
import { ActionType } from "../types/action.types.js";

export interface ThreatInput {
    night: boolean;
    poorLighting: boolean;
    routeDeviation: boolean;
    audioThreat: number;
}

export interface ThreatResult {
    risk: number;
    level: RiskLevel;
    action: ActionType;
}