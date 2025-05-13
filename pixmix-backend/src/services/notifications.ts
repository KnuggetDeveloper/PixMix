/**
 * Notification Service with Exponential Backoff
 * Handles FCM notifications from the backend to the frontend
 */
import fetch from "node-fetch";
import dotenv from "dotenv";
import { getUserToken } from './tokenService';

// Load environment variables
dotenv.config();

// Auth service URL for getting FCM tokens
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ||
  "https://gcloud-authentication-493914627855.us-central1.run.app";

// FCM API URL
const FCM_API_URL =
  "https://fcm.googleapis.com/v1/projects/pixmix-6a12e/messages:send";

/**
 * Gets an FCM authorization token from the auth service
 * @returns Promise with the FCM token
 */
async function getFCMAuthToken(): Promise<string> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/fcm-token`);

    if (!response.ok) {
      throw new Error(`Failed to get FCM token: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting FCM auth token:", error);
    throw error;
  }
}

/**
 * Sleep function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends an FCM notification with exponential backoff retry
 */
async function sendNotificationWithRetry(
  messageBody: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get fresh token for each retry in case it expired
      const fcmToken = await getFCMAuthToken();

      // Send to FCM
      const response = await fetch(FCM_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fcmToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`FCM error: ${JSON.stringify(errorData)}`);
      }

      // Success!
      return await response.json();
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Failed to send notification after retries');
}

/**
 * Sends a notification to a specific device
 */
export async function sendNotification(
  deviceToken: string,
  imageUrl: string,
  filterType: string
): Promise<any> {
  // Build message payload according to FCM v1 format
  const messageBody = {
    message: {
      token: deviceToken,
      notification: {
        title: "Image Ready!",
        body: `Your ${filterType} filter has been applied successfully.`,
      },
      data: {
        notificationType: "image_ready",
        imageUrl: imageUrl,
        filterType: filterType,
        channelId: "image-processing",
        experienceId: "@pixmix/filter-frontend",
        scopeKey: "@pixmix/filter-frontend",
      },
      android: {
        notification: {
          channel_id: "image-processing",
          priority: "HIGH",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          }
        }
      }
    },
  };

  return sendNotificationWithRetry(messageBody);
}

/**
 * Sends a notification to a user by their ID
 */
export async function sendNotificationToUser(
  userId: string,
  imageUrl: string,
  filterType: string
): Promise<any> {
  const deviceToken = await getUserToken(userId);
  
  if (!deviceToken) {
    throw new Error(`No FCM token found for user ${userId}`);
  }

  return sendNotification(deviceToken, imageUrl, filterType);
}

// Export all functions
export { getFCMAuthToken };