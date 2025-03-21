import { Context, Next } from 'koa';
import admin from '../config/firebase';
import { DefaultContext } from '../logging';

export interface AuthContext extends DefaultContext {
    user?: admin.auth.DecodedIdToken;
}

export async function authenticate(ctx: AuthContext, next: Next) {
    try {
        let authHeader: string = ctx.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No token provided');
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