// pixmix-frontend/scripts/api.ts
import * as Notifications from "expo-notifications";
import { getCachedCloudRunToken } from "../services/authService";

// Backend service URL - will be updated for production
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// Debug logging
const DEBUG = true;

/**
 * Generate a filtered image using the backend API
 */
export async function generateImage(
  imageUri: string,
  filter: string
): Promise<string> {
  try {
    if (DEBUG) console.log(`[API] Processing image with filter: ${filter}`);

    // Step 1: Get Cloud Run authentication token
    if (DEBUG) console.log("[API] Getting authentication token...");
    const authToken = await getCachedCloudRunToken();
    if (DEBUG) console.log("[API] Authentication token obtained");

    // Step 2: Prepare form data
    const formData = new FormData();
    
    // Handle image based on platform
    if (typeof window !== "undefined" && !/^file:/.test(imageUri) && !/^content:/.test(imageUri)) {
      // Web platform
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append("image", blob, "image.png");
    } else {
      // React Native platform
      formData.append("image", {
        uri: imageUri,
        name: "image.png",
        type: "image/png",
      } as any);
    }

    // Add filter parameter
    formData.append("filter", filter);

    // Add FCM token if available (for notifications)
    try {
      const fcmToken = await Notifications.getDevicePushTokenAsync();
      if (fcmToken?.data) {
        formData.append("fcmToken", fcmToken.data);
        if (DEBUG) console.log("[API] FCM token added to request");
      }
    } catch (error) {
      if (DEBUG) console.log("[API] Could not get FCM token:", error);
    }

    // Step 3: Send request to backend
    if (DEBUG) console.log("[API] Sending request to backend...");
    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: "POST",
      body: formData,
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Backend error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (DEBUG) console.log("[API] Image processed successfully");
    
    return data.imageUrl;
  } catch (error: any) {
    console.error("[API] Image processing error:", error);
    throw new Error(error.message || "Failed to process image");
  }
}

/**
 * Test the API connection and authentication
 */
export async function testAPIConnection(): Promise<boolean> {
  try {
    console.log("[API Test] Testing API connection...");
    
    // Get authentication token
    const authToken = await getCachedCloudRunToken();
    
    // Test the health endpoint
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[API Test] ✓ API connection successful:", data);
      return true;
    } else {
      console.error("[API Test] API connection failed:", response.status);
      return false;
    }
  } catch (error) {
    console.error("[API Test] API connection error:", error);
    return false;
  }
}