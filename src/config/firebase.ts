import * as admin from 'firebase-admin';
import { logger } from '../logging';
import { config } from './env';

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey,
            clientEmail: config.firebase.clientEmail,
        }),
    });
    logger.info('Firebase Admin SDK initialized successfully');
} catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
}

export default admin;