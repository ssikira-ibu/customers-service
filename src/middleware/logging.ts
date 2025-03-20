import Koa from 'koa';

interface ErrorWithDetails extends Error {
    status?: number;
    statusCode?: number;
    code?: string;
    details?: unknown;
}

export default async function requestLogger(ctx: Koa.Context, next: Koa.Next) {
    const start = Date.now();

    try {
        await next();

        // Log successful request
        const ms = Date.now() - start;
        ctx.set('X-Response-Time', `${ms}ms`);
        ctx.log.debug(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`);
    } catch (err) {
        // Log error
        const ms = Date.now() - start;
        const error = err as ErrorWithDetails;
        ctx.log.error(`${ctx.method} ${ctx.url} ${ctx.status} - ${error.message}`);
        throw error;
    }
}