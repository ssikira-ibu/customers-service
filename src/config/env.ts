import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    
    // Firebase config
    FIREBASE_PROJECT_ID: z.string(),
    FIREBASE_PRIVATE_KEY_PATH: z.string().optional(),  // Path to key file in production
    FIREBASE_PRIVATE_KEY: z.string().optional(),       // Direct key in development
    FIREBASE_CLIENT_EMAIL: z.string(),
});

function validateEnv() {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('Invalid environment variables:', result.error.format());
        process.exit(1);
    }
    
    return result.data;
}

function getFirebasePrivateKey(env: z.infer<typeof envSchema>): string {
    if (env.NODE_ENV === 'production') {
        if (!env.FIREBASE_PRIVATE_KEY_PATH) {
            throw new Error('FIREBASE_PRIVATE_KEY_PATH is required in production');
        }
        
        try {
            return require('fs').readFileSync(env.FIREBASE_PRIVATE_KEY_PATH, 'utf8');
        } catch (error) {
            console.error('❌ Failed to read Firebase private key file:', error);
            process.exit(1);
        }
    }
    
    if (!env.FIREBASE_PRIVATE_KEY) {
        throw new Error('FIREBASE_PRIVATE_KEY is required in development');
    }
    
    return env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

const env = validateEnv();

export const config = {
    nodeEnv: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    databaseUrl: env.DATABASE_URL,
    firebase: {
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: getFirebasePrivateKey(env),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
    }
} as const; 