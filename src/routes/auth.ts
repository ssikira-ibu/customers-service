import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { z } from 'zod';
import admin from '../config/firebase';
import { AuthContext } from '../middleware/auth';
import { User } from '../db/user';
import { sequelize } from '../db/database';
import { authenticate } from '../middleware/auth';

const signupSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    displayName: z.string().min(1, { message: 'Display name is required' })
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

router.get('/me', authenticate, async (ctx) => {
    // ctx.user is set by the authenticate middleware
    // Optionally, fetch more info from the User model if needed
    const userId = ctx.user?.uid;
    if (!userId) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    // Try to get user info from the database
    const user = await User.findByPk(userId);
    if (user) {
        ctx.body = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            photoURL: user.photoURL,
            disabled: user.disabled,
            lastSignInTime: user.lastSignInTime,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    } else {
        // Fallback to Firebase token info
        ctx.body = ctx.user;
    }
    ctx.status = 200;
});

export default router; 