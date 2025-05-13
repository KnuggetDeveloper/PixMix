// pixmix-frontend/services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Random from 'expo-random';
import * as Device from 'expo-device';

// Service URLs
const AUTH_SERVICE_URL = "https://gcloud-authentication-493914627855.us-central1.run.app";

// Token cache
let cachedCloudRunToken: string | null = null;
let tokenExpiry: number | null = null;

// Debug logging
const DEBUG = true;

/**
 * Generate a device-specific identifier
 */
async function getDeviceIdentifier(): Promise<string> {
  try {
    // Try to get existing device ID from storage
    const existingId = await AsyncStorage.getItem('device_id');
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    let deviceId = '';
    
    if (Device.isDevice) {
      // Use device-specific information for real devices
      deviceId = `${Device.modelName}-${Device.osVersion}-${Date.now()}`;
    } else {
      // For simulators/emulators, use random bytes
      const randomBytes = await Random.getRandomBytesAsync(16);
      deviceId = Array.from(randomBytes as Uint8Array, (byte: number) => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
    }

    // Store for future use
    await AsyncStorage.setItem('device_id', deviceId);
    return deviceId;
  } catch (error) {
    console.error('[Auth] Error generating device ID:', error);
    return `fallback-${Date.now()}`;
  }
}

/**
 * Get a Cloud Run access token from the authentication service
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    if (DEBUG) console.log("[Auth] Requesting Cloud Run token from auth service...");

    // Get device identifier for this request
    const deviceId = await getDeviceIdentifier();
    
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Call the device-auth endpoint which is more secure
        const response = await fetch(`${AUTH_SERVICE_URL}/auth/device-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-ID": deviceId,
            "X-App-Version": process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
            "X-Platform": Device.osName || "unknown",
          },
          body: JSON.stringify({
            deviceId,
            platform: Device.osName,
            appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
            timestamp: Date.now(),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Auth] Failed to get Cloud Run token: ${response.status} - ${errorText}`);
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (DEBUG) {
          console.log("[Auth] Cloud Run token received successfully");
          console.log("[Auth] Token expires in:", data.expiresIn, "seconds");
        }

        // Cache the token
        cachedCloudRunToken = data.token;
        tokenExpiry = Date.now() + (data.expiresIn - 60) * 1000;

        return data.token;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(`[Auth] Failed after ${maxRetries} attempts to get Cloud Run token`);
          throw error;
        }

        console.warn(`[Auth] Retry ${retryCount}/${maxRetries} after error`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      }
    }

    throw new Error("Failed to get Cloud Run token after retries");
  } catch (error) {
    console.error("[Auth] Error getting Cloud Run token:", error);
    throw new Error("Failed to authenticate with service");
  }
}

// ... rest of the code remains the same ...