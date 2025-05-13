/**
 * Enhanced Notification Helper
 * Central place for handling FCM notifications in the mobile app
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const NOTIFICATION_DATA_PREFIX = "notification_data_";
const FCM_TOKEN_KEY = "fcm_token";
const USER_ID_KEY = "user_id";

// Your backend URL
const BACKEND_URL = "https://filter-backend-493914627855.us-central1.run.app";

/**
 * Creates Android notification channels
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("image-processing", {
      name: "Image Processing",
      description: "Notifications for image processing status and results",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("status-updates", {
      name: "Status Updates",
      description: "Updates about image processing progress",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      enableLights: false,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
  }
}

/**
 * Configure notification handling
 */
export function setupNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Get the FCM token for this device
 */
export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    
    // Cache the token
    if (deviceToken.data) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, deviceToken.data);
    }
    
    return deviceToken.data;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    // Try to get from cache if available
    try {
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      return cachedToken;
    } catch (cacheError) {
      console.error("Error getting cached token:", cacheError);
      return null;
    }
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(userId: string): Promise<boolean> {
  try {
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.error("No FCM token available");
      return false;
    }

    const response = await fetch(`${BACKEND_URL}/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        fcmToken,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to register device token");
    }
    
    // Store user ID locally
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    
    console.log("Device token registered successfully");
    return true;
  } catch (error) {
    console.error("Error registering device token:", error);
    return false;
  }
}

/**
 * Request notification permissions
 */
export async function requestFCMPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

/**
 * Setup everything needed for notifications
 */
export async function setupNotifications(userId?: string): Promise<boolean> {
  try {
    // Create notification channels for Android
    if (Platform.OS === "android") {
      await createNotificationChannels();
    }

    // Set up handlers
    setupNotificationHandlers();

    // Request permissions
    const hasPermission = await requestFCMPermissions();
    
    if (hasPermission) {
      // Get token using Expo's API
      const token = await getFCMToken();
      if (token) {
        // If userId provided, register with backend
        if (userId) {
          await registerDeviceToken(userId);
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    return false;
  }
}

// Export other existing functions...
export function setupBackgroundHandler(): void {
  if (Platform.OS === "web") return;
  console.log("Background notification handling configured via Expo");
}

export async function showLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.error("Error showing local notification:", error);
    return false;
  }
}

// Keep existing functions for storing/getting notification data
export function storeNotificationData(key: string, data: any): string {
  const fullKey = `${NOTIFICATION_DATA_PREFIX}${key}`;
  try {
    AsyncStorage.setItem(fullKey, JSON.stringify(data));
  } catch (error) {
    console.error("Error storing notification data:", error);
  }
  return fullKey;
}

export async function getNotificationData(key: string): Promise<any> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting notification data:", error);
    return null;
  }
}