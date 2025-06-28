import { User } from '../db/models';
import admin from '../config/firebase';

/**
 * Ensures a user exists in the database, creating the record if it doesn't exist.
 * This function fetches user details from Firebase Auth and creates a corresponding
 * record in the local database.
 * 
 * @param userId - The Firebase UID of the user
 * @returns Promise<User> - The user record from the database
 */
export async function ensureUserExists(userId: string): Promise<User> {
    try {
        // First try to find user in local database
        let user = await User.findByPk(userId);
        
        if (user) {
            return user;
        }

        // If not found, fetch from Firebase and create local record
        const firebaseUser = await admin.auth().getUser(userId);
        
        user = await User.create({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'Unknown User',
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL || undefined,
            disabled: firebaseUser.disabled,
            lastSignInTime: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined
        });

        return user;
    } catch (error) {
        // If Firebase call fails, try to get user from local database as fallback
        const localUser = await User.findByPk(userId);
        if (localUser) {
            return localUser;
        }
        
        // Re-throw the original error if we can't find the user anywhere
        throw error;
    }
}

/**
 * Updates local user data from Firebase (useful for keeping data in sync)
 * @param userId - The Firebase UID of the user
 */
export async function syncUserFromFirebase(userId: string): Promise<User | null> {
    try {
        const firebaseUser = await admin.auth().getUser(userId);
        
        const [user, created] = await User.findOrCreate({
            where: { id: userId },
            defaults: {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || 'Unknown User',
                emailVerified: firebaseUser.emailVerified,
                photoURL: firebaseUser.photoURL || undefined,
                disabled: firebaseUser.disabled,
                lastSignInTime: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined
            }
        });

        // Update existing user if not created
        if (!created) {
            await user.update({
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || 'Unknown User',
                emailVerified: firebaseUser.emailVerified,
                photoURL: firebaseUser.photoURL || undefined,
                disabled: firebaseUser.disabled,
                lastSignInTime: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined
            });
        }

        return user;
    } catch (error) {
        // Return null if Firebase is unavailable, allowing fallback to local data
        return null;
    }
} 