export interface AlertInput {
    toNumber: string;
    riskScore: number;
    locationLink: string;
    guardianName?: string;
}

export interface AlertResult {
    status: 'sent' | 'failed';
    messageSid?: string;
    error?: string;
}