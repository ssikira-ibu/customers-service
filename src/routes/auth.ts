import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { z } from 'zod';
import admin from '../config/firebase';
import { AuthContext } from '../middleware/auth';
import { User } from '../db/user';
import { sequelize } from '../db/database';

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
        
        // Get user by email first
        const userRecord = await admin.auth().getUserByEmail(email);
        ctx.log.info('userRecord', userRecord);
        // Verify password using Firebase Admin SDK
        await admin.auth().updateUser(userRecord.uid, {
            password: password // This will fail if password is incorrect
        });

        // Get or create user in our database
        const [user, created] = await User.findOrCreate({
            where: { id: userRecord.uid },
            defaults: {
                id: userRecord.uid,
                email: userRecord.email!,
                displayName: userRecord.displayName || email.split('@')[0],
                emailVerified: userRecord.emailVerified,
                photoURL: userRecord.photoURL || undefined,
                disabled: userRecord.disabled,
                lastSignInTime: new Date()
            }
        });

        if (!created) {
            // Update user info if they already exist
            await user.update({
                emailVerified: userRecord.emailVerified,
                photoURL: userRecord.photoURL || undefined,
                disabled: userRecord.disabled,
                lastSignInTime: new Date()
            });
        }

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        ctx.status = 200;
        ctx.body = {
            userId: userRecord.uid,
            customToken
        };

    } catch (error: any) {
        ctx.log.error('Login error:', error);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-password') {
            ctx.status = 401;
            ctx.body = { error: 'Invalid email or password' };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: 'Authentication failed' };
    }
});

export default router; 