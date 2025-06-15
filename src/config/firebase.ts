import * as admin from 'firebase-admin';
import { logger } from '../logging';

try {
    // Read Firebase credentials from environment variable
    const firebaseCredentialsRaw = process.env.FIREBASE_CREDENTIALS;
    
    if (!firebaseCredentialsRaw) {
        throw new Error('FIREBASE_CREDENTIALS environment variable is not set');
    }

    // Parse the base64-encoded credentials
    const firebaseCredentials = JSON.parse(firebaseCredentialsRaw);

    admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
    });
    logger.info('Firebase Admin SDK initialized successfully');
} catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
}

export default admin;