import { Module } from '@nitrostack/core';
import { RakshaNetService } from './rakshanet.service.js';
import { RakshaNetTools } from './rakshanet.tools.js';
import { RakshaNetTaskTools } from './rakshanet.tasks.js';

@Module({
    name: 'rakshanet',
    description: 'AI-powered women safety module',
    controllers: [RakshaNetTools, RakshaNetTaskTools],
    providers: [RakshaNetService],
})
export class RakshaNetModule { }