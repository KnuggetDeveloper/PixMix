import * as Notifications from "expo-notifications";
import { getCachedCloudRunToken } from "../services/authService";

// Backend service URL
const BACKEND_URL = "http://localhost:3000";

/**
 * Generate a filtered image using the backend API
 */
export async function generateImage(
  imageUri: string,
  filter: string
): Promise<string> {
  try {
    console.log(`Processing image with filter: ${filter}`);

    // Get authentication token
    const authToken = await getCachedCloudRunToken();

    // Create form data
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

    // Add FCM token if available
    try {
      const fcmToken = await Notifications.getDevicePushTokenAsync();
      if (fcmToken?.data) {
        formData.append("fcmToken", fcmToken.data);
      }
    } catch (error) {
      console.log("Could not get FCM token:", error);
    }

    // Send request to backend
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
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error: any) {
    console.error("Image processing error:", error);
    throw new Error(error.message || "Failed to process image");
  }
}