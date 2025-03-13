import { Context } from "koa";
import pino, { Logger } from 'pino';

export interface DefaultContext extends Context {
    log: Logger
}

export const logger = pino({
    name: "customers-service",
    level: "debug",
    msgPrefix: "[Koa] "
});

