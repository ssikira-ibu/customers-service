import * as admin from 'firebase-admin';
import { logger } from '../logging';
import { config } from './env';
import { readFileSync } from 'fs';

const firebaseCredsPath = '/run/secrets/firebase_credentials';

try {
    // Read and parse the Firebase credentials from Docker secret
    const firebaseCredsRaw = readFileSync(firebaseCredsPath, 'utf8');
    const firebaseCredentials = JSON.parse(firebaseCredsRaw);

    admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
    });
    logger.info('Firebase Admin SDK initialized successfully');
} catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
}

export default admin;