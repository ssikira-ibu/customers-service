import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8080'),
    DATABASE_URL: z.string(),
    
    // Firebase config - optional since we handle it separately in firebase.ts
    FIREBASE_CREDENTIALS: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_PRIVATE_KEY_PATH: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
});

function validateEnv() {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('Invalid environment variables:', result.error.format());
        process.exit(1);
    }
    
    return result.data;
}

const env = validateEnv();

export const config = {
    nodeEnv: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    databaseUrl: env.DATABASE_URL,
} as const; 