import * as admin from 'firebase-admin';
import { logger } from '../logging';
import fs from 'fs';
import path from 'path';

try {
    // Priority: Docker secret (for local dev with Docker Compose) -> env var (for prod) -> /secrets/firebase.json (fallback)
    const dockerSecretPath = '/run/secrets/firebase_credentials';
    let firebaseCredentials;

    if (fs.existsSync(dockerSecretPath)) {
        firebaseCredentials = JSON.parse(fs.readFileSync(dockerSecretPath, 'utf8'));
        logger.info('Firebase credentials loaded from Docker secret at /run/secrets/firebase_credentials');
    } else if (process.env.FIREBASE_CREDENTIALS) {
        firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        logger.info('Firebase credentials loaded from environment variable');
    } else {
        const secretsPath = path.resolve(__dirname, '../../secrets/firebase.json');
        if (fs.existsSync(secretsPath)) {
            firebaseCredentials = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
            logger.info('Firebase credentials loaded from /secrets/firebase.json');
        } else {
            throw new Error('Firebase credentials not found: provide Docker secret (/run/secrets/firebase_credentials), set FIREBASE_CREDENTIALS env variable, or provide /secrets/firebase.json');
        }
    }

    admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
    });
    logger.info('Firebase Admin SDK initialized successfully');
} catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
}

export default admin;