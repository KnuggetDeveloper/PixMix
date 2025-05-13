// pixmix-frontend/services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Service URLs - will be updated for production
const AUTH_SERVICE_URL = "https://gcloud-authentication-493914627855.us-central1.run.app";

// Token cache
let cachedCloudRunToken: string | null = null;
let tokenExpiry: number | null = null;

// Add debug logging
const DEBUG = true;

/**
 * Get a Google identity token for service authentication
 * In development: Manual token from gcloud auth print-identity-token
 * In production: Will come from a dedicated token provider service
 */
export async function getGoogleIdentityToken(): Promise<string> {
  try {
    if (DEBUG) console.log("[Auth] Getting Google Identity Token...");

    // Check if we're in development or production
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!isDevelopment) {
      // In development, use a hardcoded token (but be aware it will expire)
      // Better approach: use environment variables that can be updated regularly
      const devToken = process.env.GOOGLE_IDENTITY_TOKEN;

      if (!devToken) {
        throw new Error(
          "No Google Identity token available. Set GOOGLE_IDENTITY_TOKEN env variable."
        );
      }

      if (DEBUG)
        console.log("[Auth] Development Google Identity Token obtained");
      return devToken;
    } else {
      // In production:
      // Option 1: Use a token from a server-side API that can generate fresh tokens
      // This is just an example - implement according to your authentication flow
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/identity-token`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get identity token: ${response.status}`);
      }

      const data = await response.json();

      if (DEBUG)
        console.log("[Auth] Production Google Identity Token obtained");
      return data.token;

      // Option 2: If the above doesn't work, you might need to implement
      // Google Sign-In directly in your app and get the ID token from there
    }
  } catch (error) {
    console.error("[Auth] Error getting Google Identity token:", error);
    throw error;
  }
}

/**
 * Get a Cloud Run access token from the authentication service
 * This token will be used to authenticate with the backend service
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    if (DEBUG)
      console.log("[Auth] Requesting Cloud Run token from auth service...");

    // Get Google identity token first
    const identityToken = await getGoogleIdentityToken();

    // Try to get the token, with retries for transient errors
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Call the public-token endpoint with Google Identity token
        const response = await fetch(`${AUTH_SERVICE_URL}/auth/public-token`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${identityToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[Auth] Failed to get Cloud Run token: ${response.status} - ${errorText}`
          );

          // If this is an authentication error, don't retry - get a new identity token
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${response.status}`);
          }

          // For other errors like 500, 503, etc. - we'll retry
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (DEBUG) {
          console.log("[Auth] Cloud Run token received successfully");
          console.log("[Auth] Token expires in:", data.expiresIn, "seconds");
        }

        return data.token;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(
            `[Auth] Failed after ${maxRetries} attempts to get Cloud Run token`
          );
          throw error;
        }

        console.warn(
          `[Auth] Retry ${retryCount}/${maxRetries} after error: ${error instanceof Error ? error.message : "Unknown error"}`
        );

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount))
        );
      }
    }

    // This should never be reached due to the throw in the retry loop
    throw new Error("Failed to get Cloud Run token after retries");
  } catch (error) {
    console.error("[Auth] Error getting Cloud Run token:", error);
    throw new Error("Failed to authenticate with service");
  }
}

/**
 * Get a cached Cloud Run token, refreshing if necessary
 * Tokens are cached for 50 minutes (they expire in 60 minutes)
 */
export async function getCachedCloudRunToken(): Promise<string> {
  const now = Date.now();

  // Check if we have a valid cached token
  if (cachedCloudRunToken && tokenExpiry && now < tokenExpiry) {
    if (DEBUG) console.log("[Auth] Using cached Cloud Run token");
    return cachedCloudRunToken;
  }

  if (DEBUG) console.log("[Auth] Token expired or not cached, refreshing...");

  // Get a new token
  const token = await getCloudRunToken();

  // Cache for 50 minutes (tokens expire in 60 minutes)
  cachedCloudRunToken = token;
  tokenExpiry = now + 50 * 60 * 1000;

  return token;
}

/**
 * Clear the token cache
 * Useful for forcing a token refresh
 */
export function clearTokenCache(): void {
  if (DEBUG) console.log("[Auth] Clearing token cache");
  cachedCloudRunToken = null;
  tokenExpiry = null;
}

/**
 * Test the authentication flow
 * This function can be used to verify the entire auth chain is working
 */
export async function testAuthenticationFlow(): Promise<boolean> {
  try {
    console.log("[Auth Test] Starting authentication flow test...");

    // Step 1: Get Google Identity Token
    console.log("[Auth Test] Step 1: Getting Google Identity Token");
    const identityToken = await getGoogleIdentityToken();
    console.log("[Auth Test] ✓ Google Identity Token obtained");

    // Step 2: Get Cloud Run Token
    console.log("[Auth Test] Step 2: Getting Cloud Run Token");
    const cloudRunToken = await getCloudRunToken();
    console.log("[Auth Test] ✓ Cloud Run Token obtained");

    // Step 3: Test caching
    console.log("[Auth Test] Step 3: Testing token caching");
    const cachedToken = await getCachedCloudRunToken();
    console.log("[Auth Test] ✓ Token caching working");

    console.log("[Auth Test] Authentication flow test completed successfully");
    return true;
  } catch (error) {
    console.error("[Auth Test] Authentication flow test failed:", error);
    return false;
  }
}

// Store the current user ID (for notifications)
let currentUserId: string | null = null;

export async function setCurrentUserId(userId: string): Promise<void> {
  currentUserId = userId;
  await AsyncStorage.setItem("user_id", userId);
}

export async function getCurrentUserId(): Promise<string | null> {
  if (currentUserId) return currentUserId;

  const storedId = await AsyncStorage.getItem("user_id");
  if (storedId) {
    currentUserId = storedId;
    return storedId;
  }

  // Generate new user ID if none exists
  const newId = `user_${Date.now()}`;
  await setCurrentUserId(newId);
  return newId;
}
