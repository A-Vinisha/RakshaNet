import { Injectable } from '@nitrostack/core';

import { ThreatService } from './services/threat.service.js';
import { DecisionService } from './services/decision.service.js';
import { LocationService } from './services/location.service.js';
import { CommunicationService } from './services/communication.js';

import { ThreatInput } from './dto/threat.dto.js';

@Injectable({
    deps: [ThreatService, DecisionService, LocationService, CommunicationService],
})
export class RakshaNetService {
    constructor(
        private readonly threatService: ThreatService,
        private readonly decisionService: DecisionService,
        private readonly locationService: LocationService,
        private readonly communicationService: CommunicationService,
    ) {}

    async assessThreat(input: ThreatInput) {
        const threat = this.threatService.assessThreat(input);
        const decision = this.decisionService.decide(threat.level);

        let location = null;
        if (input.lat !== undefined && input.lng !== undefined) {
            location = this.locationService.assessLocation({
                lat: input.lat,
                lng: input.lng,
                expectedRoute: input.expectedRoute,
            });
        }

        let alert = null;
        if ((decision.sendSMS || decision.notifyGuardian) && input.toNumber) {
            alert = await this.communicationService.sendAlert({
                toNumber: input.toNumber,
                riskScore: threat.risk,
                locationLink: input.lat && input.lng
                    ? `https://maps.google.com/?q=${input.lat},${input.lng}`
                    : 'Location unavailable',
                guardianName: input.guardianName,
            });
        }

        return {
            ...threat,
            decision,
            location,
            alert,
        };
    }
}