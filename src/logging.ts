import { Context } from "koa";
import pino, { Logger } from 'pino';
import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config';

export interface DefaultContext extends Context {
    log: Logger
}

function createLoggerConfig() {
    const baseConfig = {
        name: "customers-service",
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization']
    };

    // Use GCP logging format only in production
    if (process.env.NODE_ENV === 'production') {
        return {
            ...baseConfig,
            ...createGcpLoggingPinoConfig()
        };
    }

    return baseConfig;
}

export const logger = pino(createLoggerConfig());

