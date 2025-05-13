// pixmix-frontend/services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";


// Service URLs - will be updated for production
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";

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
    
    // In development, use environment variable
    const manualToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImUxNGMzN2Q2ZTVjNzU2ZThiNzJmZGI1MDA0YzBjYzM1NjMzNzkyNGUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjU1NTk0MDU1OS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6IjMyNTU1OTQwNTU5LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTA0MzU5ODA4MTUwMjAxODg3MjQyIiwiaGQiOiJnZXRrbnVnZ2V0LmNvbSIsImVtYWlsIjoiZGV2ZWxvcGVyQGdldGtudWdnZXQuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJGLWNIODNiSks1SGpZbU1oOGlTdlZRIiwiaWF0IjoxNzQ3MTM5NDUxLCJleHAiOjE3NDcxNDMwNTF9.eFh5FgZANuMoMWdB7lIvtWfuQcBpSdC-8vnUIfKkZbI8YVJR8R3LTrLpWx_VyMxl9XLSOG5P9zRZ8R9A6J8SRTdiahfGHlTlth-9pIM_HCDdMfuqINivAZcXCecsC5TIiX2kEsbylbcSKv_6EaXMGLdfCwqYvtETzEh2tJESR2Xl7zdrjN3fTebi15TPi-ZoOEnqwNzPWw1l3CC_TwgG7HGgRtPR6XJBM3HIq7kVcxQDKPaGJWJaR9kf0XDUOAJVHaOERR78-CQ9eKm-WYDU8qMk6Ry3KzEubIIRUTVtRGJEv5_5cD522PdHBPhAeVEOhtB0GR2xt-uUK_Q2fkAEcg";
    
    if (!manualToken) {
      throw new Error("No Google Identity token available. Run: gcloud auth print-identity-token");
    }
    
    if (DEBUG) console.log("[Auth] Google Identity Token obtained");
    return manualToken;
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
    if (DEBUG) console.log("[Auth] Requesting Cloud Run token from auth service...");
    
    // Get Google identity token first
    const identityToken = await getGoogleIdentityToken();
    
    // Call the public-token endpoint with Google Identity token
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/public-token`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${identityToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Auth] Failed to get Cloud Run token: ${response.status} - ${errorText}`);
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (DEBUG) {
      console.log("[Auth] Cloud Run token received successfully");
      console.log("[Auth] Token expires in:", data.expiresIn, "seconds");
    }
    
    return data.token;
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
  tokenExpiry = now + (50 * 60 * 1000);
  
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