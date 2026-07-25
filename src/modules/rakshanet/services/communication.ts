import { Injectable } from "@nitrostack/core";
import twilio from "twilio";
import { AlertInput, AlertResult } from "../dto/communication.dto.js";

@Injectable()
export class CommunicationService {

    async sendAlert(input: AlertInput): Promise<AlertResult> {

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

        if (!accountSid || !authToken || !fromNumber) {
            return {
                status: 'failed',
                error: 'Twilio credentials are missing in environment variables',
            };
        }

        const client = twilio(accountSid, authToken);

        const greeting = input.guardianName ? `Hi ${input.guardianName}, ` : '';
        const messageBody =
            `🚨 RAKSHANET ALERT 🚨\n${greeting}Risk Score: ${input.riskScore}/100\n` +
            `Live Location: ${input.locationLink}\nPlease check on this person immediately.`;

        try {
            const message = await client.messages.create({
                from: fromNumber,
                to: `whatsapp:${input.toNumber}`,
                body: messageBody,
            });

            return {
                status: 'sent',
                messageSid: message.sid,
            };
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.message,
            };
        }
    }
}