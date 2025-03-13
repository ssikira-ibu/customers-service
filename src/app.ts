import Koa from 'koa';
import { DefaultContext, logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './router';

const app = new Koa<Koa.DefaultState, DefaultContext>();
app.context.log = logger;

initializeDatabase().then(() => {
    app
        .use(router.routes())
        .use(router.allowedMethods())
        .use(async (ctx, next) => {
            await next();
            const rt = ctx.response.get('X-Response-Time');
            ctx.log.debug(`${ctx.method} ${ctx.url} - ${rt}`);
        })
        .use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const ms = Date.now() - start;
            ctx.set('X-Response-Time', `${ms}ms`);
        });

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch((error) => {
    logger.error('Failed to start:', error);
    process.exit(1);
});
