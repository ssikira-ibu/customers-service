import Router from 'koa-router';
import { sequelize } from '../db/database';

const router = new Router();

router.get('/health', async (ctx) => {
    try {
        // Check database connection
        await sequelize.authenticate();
        
        ctx.status = 200;
        ctx.body = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        };
    } catch (error) {
        ctx.status = 503;
        ctx.body = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});

export default router; 