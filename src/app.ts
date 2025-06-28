import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}

import Koa from 'koa';
import helmet from 'koa-helmet'
// import cors from '@koa/cors'; // Removed
import { logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './routes/customers/index';
import authRouter from './routes/auth';
import './config/firebase';
import { AuthContext } from './middleware/auth';
import requestLogger from './middleware/logging';

const app = new Koa<Koa.DefaultState, AuthContext>();
app.context.log = logger;

// Add a health check endpoint
app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
        ctx.status = 200;
        ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
        return;
    }
    await next();
});

initializeDatabase().then(() => {
    app
        .use(helmet())
        .use(requestLogger)
        .use(authRouter.routes())
        .use(authRouter.allowedMethods())
        .use(router.routes())
        .use(router.allowedMethods());

    const PORT = parseInt(process.env.PORT || '8080', 10); // Parse as number for Cloud Run

    app.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
        logger.info(`Server is running on http://0.0.0.0:${PORT}`);
    });
}).catch((error) => {
    logger.error('Failed to start:', error);
    process.exit(1);
});
