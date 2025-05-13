import { GoogleAuth, JWT } from "google-auth-library";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Google Auth for Cloud Run
const cloudRunAuth = new GoogleAuth({
  credentials: {
    client_email: process.env.CLOUD_RUN_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.CLOUD_RUN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/**
 * Get an access token for Cloud Run services
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    const client = await cloudRunAuth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error("Token not received from Google Auth");
    }

    return tokenResponse.token;
  } catch (error) {
    console.error("Error getting Cloud Run token:", error);
    throw new Error("Failed to get Cloud Run access token");
  }
}

/**
 * Get an OAuth token for Firebase Cloud Messaging (FCM)
 */
export async function getFCMAuthToken(): Promise<string> {
  try {
    const jwtClient = new JWT({
      email: process.env.FIREBASE_CLIENT_EMAIL,
      key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const token = await jwtClient.authorize();

    if (!token.access_token) {
      throw new Error("FCM token not received");
    }

    return token.access_token;
  } catch (error) {
    console.error("Error generating FCM token:", error);
    throw new Error("Failed to generate FCM token");
  }
}