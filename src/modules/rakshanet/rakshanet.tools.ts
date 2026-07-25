import {
    ToolDecorator as Tool,
    ExecutionContext,
    Injectable,
    z,
} from '@nitrostack/core';

import { RakshaNetService } from './rakshanet.service.js';

const ThreatSchema = z.object({
    night: z.boolean(),
    poorLighting: z.boolean(),
    routeDeviation: z.boolean(),
    audioThreat: z.number().min(0).max(100),
});

@Injectable({ deps: [RakshaNetService] })
export class RakshaNetTools {
    constructor(
        private readonly rakshaNetService: RakshaNetService,
    ) {}

    @Tool({
        name: 'assess_threat',
        description: 'Assess the user safety risk based on environmental conditions.',
        inputSchema: ThreatSchema,
    })
    async assessThreat(
        args: z.infer<typeof ThreatSchema>,
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Assessing threat', args);

        return this.rakshaNetService.assessThreat(args);
    }
}