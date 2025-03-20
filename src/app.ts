import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}

import Koa from 'koa';
import helmet from 'koa-helmet'
import { logger } from './logging';
import { initializeDatabase } from './db/database';
import router from './routes/customers/index';
import authRouter from './routes/auth';
import './config/firebase';
import { AuthContext } from './middleware/auth';
import requestLogger from './middleware/logging';

const app = new Koa<Koa.DefaultState, AuthContext>();
app.context.log = logger;



initializeDatabase().then(() => {
    app
        .use(helmet())
        .use(requestLogger)
        .use(authRouter.routes())
        .use(authRouter.allowedMethods())
        .use(router.routes())
        .use(router.allowedMethods());

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        logger.info(`Server is running on http://localhost:${PORT}`);
    });
}).catch((error) => {
    logger.error('Failed to start:', error);
    process.exit(1);
});
