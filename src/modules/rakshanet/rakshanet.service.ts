import { Injectable } from '@nitrostack/core';

export interface ThreatInput {
    night: boolean;
    poorLighting: boolean;
    routeDeviation: boolean;
    audioThreat: number;
}

@Injectable()
export class RakshaNetService {

    assessThreat(input: ThreatInput) {

        let risk = 0;

        if (input.night) risk += 20;
        if (input.poorLighting) risk += 20;
        if (input.routeDeviation) risk += 30;

        risk += Math.min(input.audioThreat, 30);

        let level = 'Low';
        let action = 'NONE';

        if (risk >= 70) {
            level = 'Critical';
            action = 'VERIFY_USER';
        } else if (risk >= 50) {
            level = 'High';
            action = 'ALERT';
        } else if (risk >= 30) {
            level = 'Medium';
            action = 'MONITOR';
        }

        return {
            risk,
            level,
            action,
        };
    }
}