import auth from "@react-native-firebase/auth";

// Authentication service URL
const AUTH_SERVICE_URL = "http://localhost:4000";

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Get a Google identity token for service authentication
 * This will be replaced with a proper token provider in production
 */
async function getGoogleIdentityToken(): Promise<string> {
  // In production, this would come from a token provider
  // For now, using a manual token from gcloud auth print-identity-token
  const manualToken = process.env.GOOGLE_IDENTITY_TOKEN || "";
  console.log("manualToken", manualToken);
  return manualToken;
}

/**
 * Get a Cloud Run token from the authentication service
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    // Get Google identity token for authentication
    const identityToken = await getGoogleIdentityToken();
    
    // Request public token endpoint (authenticated at Cloud Run level)
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/public-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${identityToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting Cloud Run token:", error);
    throw new Error("Authentication failed");
  }
}

/**
 * Get a cached Cloud Run token, refreshing if necessary
 */
export async function getCachedCloudRunToken(): Promise<string> {
  const now = Date.now();
  
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // Get a new token
  const token = await getCloudRunToken();
  
  // Cache for 50 minutes (tokens expire in 60 minutes)
  cachedToken = token;
  tokenExpiry = now + (50 * 60 * 1000);
  
  return token;
}

/**
 * Clear the token cache
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = null;
}

/**
 * Get the current Firebase user
 */
export async function getCurrentUser(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) {
    // Sign in anonymously if no user
    await auth().signInAnonymously();
    return auth().currentUser?.uid || null;
  }
  return user.uid;
}