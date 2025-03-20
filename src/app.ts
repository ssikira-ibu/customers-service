import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}

import Koa from 'koa';
import helmet from 'koa-helmet'
import { DefaultContext, logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './routes/customers/index';
import authRouter from './routes/auth';
import './config/firebase';
import { AuthContext } from './middleware/auth';

const app = new Koa<Koa.DefaultState, AuthContext>();
app.context.log = logger;

async function logHeaders(ctx: Koa.Context, next: Koa.Next) {
    // ctx.log.info(ctx.get('Authorization'));
    await next();
}

initializeDatabase().then(() => {
    app
        .use(helmet())
        .use(logHeaders)
        .use(authRouter.routes())
        .use(authRouter.allowedMethods())
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
