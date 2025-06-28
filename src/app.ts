import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}

import Koa from 'koa';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import { logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './routes/customers/index';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import './config/firebase';
import { AuthContext } from './middleware/auth';
import requestLogger from './middleware/logging';

const app = new Koa<Koa.DefaultState, AuthContext>();
app.context.log = logger;

initializeDatabase().then(() => {
    app
        .use(helmet())
        .use(cors({
            origin: (ctx) => {
                const origin = ctx.get('Origin');
                
                // Allow localhost with any port for development
                if (process.env.NODE_ENV !== 'production') {
                    if (origin && (
                        origin.startsWith('http://localhost:') ||
                        origin.startsWith('http://127.0.0.1:') ||
                        origin === 'http://localhost:3000'
                    )) {
                        return origin;
                    }
                    // Default to allow all origins in development
                    return '*';
                }
                
                // Add your production domains here when needed
                const allowedOrigins = [
                    'https://google.com'
                ];
                
                if (allowedOrigins.includes(origin)) {
                    return origin;
                }
                
                // Reject in production if not in allowed list
                throw new Error('CORS not allowed');
            },
            allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
            credentials: true,
        }))
        .use(requestLogger)
        .use(authRouter.routes())
        .use(healthRouter.routes())
        .use(healthRouter.allowedMethods())
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
