import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { z } from 'zod';
import admin from '../config/firebase';
import { AuthContext } from '../middleware/auth';

const authSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' })
}).strict();

const router = new Router<any, AuthContext>({
    prefix: '/auth'
}).use(bodyParser());

router.post('/signup', async (ctx) => {
    try {
        const result = authSchema.safeParse(ctx.request.body);
        
        if (!result.success) {
            ctx.status = 400;
            ctx.body = { errors: result.error.errors };
            return;
        }

        const { email, password } = result.data;

        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
            email,
            password,
            emailVerified: false
        });

        // Generate custom token for immediate login
        const token = await admin.auth().createCustomToken(userRecord.uid);

        ctx.status = 201;
        ctx.body = {
            message: 'User created successfully',
            userId: userRecord.uid,
            token
        };

    } catch (error: any) {
        ctx.log.error('Signup error:', error);
        
        if (error.code === 'auth/email-already-exists') {
            ctx.status = 409;
            ctx.body = { error: 'Email already in use' };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: 'Failed to create user' };
    }
});

router.post('/login', async (ctx) => {
    try {
        const result = authSchema.safeParse(ctx.request.body);
        
        if (!result.success) {
            ctx.status = 400;
            ctx.body = { errors: result.error.errors };
            return;
        }

        const { email } = result.data;

        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Generate custom token
        const token = await admin.auth().createCustomToken(userRecord.uid);

        ctx.status = 200;
        ctx.body = {
            userId: userRecord.uid,
            token
        };

    } catch (error: any) {
        ctx.log.error('Login error:', error);
        
        if (error.code === 'auth/user-not-found') {
            ctx.status = 404;
            ctx.body = { error: 'User not found' };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: 'Authentication failed' };
    }
});

export default router; 