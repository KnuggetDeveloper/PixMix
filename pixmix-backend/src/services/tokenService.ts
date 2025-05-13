import { firestore } from '../config/firebase';
import admin from 'firebase-admin';

interface UserToken {
  fcmToken: string;
  platform: 'ios' | 'android' | 'web';
  lastUpdated: admin.firestore.Timestamp;
  userId?: string;
}

export async function storeUserToken(
  userId: string, 
  fcmToken: string, 
  platform: string = 'ios'
): Promise<void> {
  try {
    await firestore.collection('user_tokens').doc(userId).set({
      fcmToken,
      platform,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      userId
    }, { merge: true });
    
    console.log(`Token stored for user ${userId}`);
  } catch (error) {
    console.error('Error storing user token:', error);
    throw error;
  }
}

export async function getUserToken(userId: string): Promise<string | null> {
  try {
    const doc = await firestore.collection('user_tokens').doc(userId).get();
    if (doc.exists) {
      const data = doc.data() as UserToken;
      return data.fcmToken;
    }
    return null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

export async function removeUserToken(userId: string): Promise<void> {
  try {
    await firestore.collection('user_tokens').doc(userId).delete();
  } catch (error) {
    console.error('Error removing user token:', error);
  }
}