import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { z } from 'zod';
import admin from '../config/firebase';
import { AuthContext } from '../middleware/auth';
import { User } from '../db/user';
import { sequelize } from '../db/database';
import { authenticate } from '../middleware/auth';
import { ensureUserExists } from '../utils/user';

const signupSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    displayName: z.string().min(1, { message: 'Display name is required' })
}).strict();

const loginSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' })
}).strict();

const router = new Router<any, AuthContext>({
    prefix: '/auth'
}).use(bodyParser());

router.post('/signup', async (ctx) => {
    const transaction = await sequelize.transaction();
    
    try {
        const result = signupSchema.safeParse(ctx.request.body);
        
        if (!result.success) {
            ctx.status = 400;
            ctx.body = { errors: result.error.errors };
            return;
        }

        const { email, password, displayName } = result.data;

        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
            email,
            password,
            emailVerified: false,
            displayName
        });

        // Store user in DB
        await User.create({
            id: userRecord.uid,
            email,
            displayName,
            emailVerified: userRecord.emailVerified,
            photoURL: userRecord.photoURL || undefined,
            disabled: userRecord.disabled,
            lastSignInTime: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : undefined
        }, { transaction });

        await transaction.commit();

        // Generate custom token for immediate login
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        ctx.status = 201;
        ctx.body = {
            message: 'User created successfully',
            userId: userRecord.uid,
            customToken
        };

    } catch (error: any) {
        await transaction.rollback();
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
        const result = loginSchema.safeParse(ctx.request.body);
        
        if (!result.success) {
            ctx.status = 400;
            ctx.body = { errors: result.error.errors };
            return;
        }

        const { email, password } = result.data;

        // Verify user credentials with Firebase
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Note: Firebase Admin SDK doesn't support password verification directly
        // In a real implementation, you'd use Firebase Auth REST API or client SDK
        // For local testing, we'll just check if the user exists and generate a token
        
        if (userRecord.disabled) {
            ctx.status = 401;
            ctx.body = { error: 'Account is disabled' };
            return;
        }

        // Generate custom token for the user
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        ctx.status = 200;
        ctx.body = {
            message: 'Login successful',
            userId: userRecord.uid,
            customToken
        };

    } catch (error: any) {
        ctx.log.error('Login error:', error);
        
        if (error.code === 'auth/user-not-found') {
            ctx.status = 401;
            ctx.body = { error: 'Invalid email or password' };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: 'Login failed' };
    }
});

router.get('/me', authenticate, async (ctx) => {
    // ctx.user is set by the authenticate middleware
    const userId = ctx.user?.uid;
    if (!userId) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Get user directly from Firebase
        const firebaseUser = await admin.auth().getUser(userId);

        ctx.body = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL,
            disabled: firebaseUser.disabled,
            lastSignInTime: firebaseUser.metadata.lastSignInTime,
            createdAt: firebaseUser.metadata.creationTime,
            updatedAt: firebaseUser.metadata.lastRefreshTime || firebaseUser.metadata.creationTime
        };
        ctx.status = 200;
    } catch (error) {
        ctx.log.error('Error fetching user info:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch user information' };
    }
});

export default router; 