import { Injectable } from '@nitrostack/core';

import { ThreatService } from './services/threat.service.js';
import { DecisionService } from './services/decision.service.js';

import { ThreatInput } from './dto/threat.dto.js';

@Injectable({
    deps: [ThreatService, DecisionService],
})
export class RakshaNetService {
    constructor(
        private readonly threatService: ThreatService,
        private readonly decisionService: DecisionService,
    ) {}

    assessThreat(input: ThreatInput) {
        const threat = this.threatService.assessThreat(input);
        const decision = this.decisionService.decide(threat.level);

        return {
            ...threat,
            decision,
        };
    }
}