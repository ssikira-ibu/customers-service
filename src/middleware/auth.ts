import { Context, Next } from 'koa';
import admin from '../config/firebase';
import { DefaultContext } from '../logging';

export interface AuthContext extends DefaultContext {
    user?: admin.auth.DecodedIdToken;
}

export async function authMiddleware(ctx: AuthContext, next: Next) {
    try {
        const authHeader = ctx.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { error: 'No token provided' };
            return;
        }

        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Attach the user information to the context
        ctx.user = decodedToken;
        
        await next();
    } catch (error) {
        ctx.log.error('Authentication error:', error);
        ctx.status = 401;
        ctx.body = { error: 'Invalid token' };
    }
}

// Optional middleware that only checks for auth if token is provided
export async function optionalAuthMiddleware(ctx: AuthContext, next: Next) {
    try {
        const authHeader = ctx.get('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await admin.auth().verifyIdToken(token);
            ctx.user = decodedToken;
        }
        
        await next();
    } catch (error) {
        ctx.log.error('Authentication error:', error);
        ctx.status = 401;
        ctx.body = { error: 'Invalid token' };
    }
} 