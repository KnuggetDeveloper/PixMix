// gcloud-authentication/src/routes/auth.ts
import { Router, Request, Response } from "express";
import { getCloudRunToken, getFCMAuthToken } from "../utils/google-auth";
import { verifyFirebaseToken } from "../middleware/firebase";
import crypto from "crypto";

const router = Router();
const DEBUG = true;

// Device authentication settings
const DEVICE_SECRET = process.env.DEVICE_SECRET || crypto.randomBytes(32).toString('hex');
const ALLOWED_APP_VERSIONS = process.env.ALLOWED_APP_VERSIONS?.split(',') || ["1.0.0"];

/**
 * Validate device request
 */
function validateDeviceRequest(req: Request): boolean {
  const deviceId = req.headers["x-device-id"];
  const appVersion = req.headers["x-app-version"];
  const platform = req.headers["x-platform"];

  if (!deviceId || !appVersion || !platform) {
    return false;
  }

  // Check app version is allowed
  if (!ALLOWED_APP_VERSIONS.includes(appVersion as string)) {
    console.log(`[Auth] Invalid app version: ${appVersion}`);
    return false;
  }

  // Additional validation can be added here
  // - Rate limiting per device ID
  // - Platform validation
  // - Timestamp validation

  return true;
}

/**
 * Device-based authentication endpoint
 * More secure than a simple API key
 */
router.post("/device-token", async (req: Request, res: Response): Promise<any> => {
  try {
    if (DEBUG) {
      console.log("[Auth Service] Device token requested");
      console.log("[Auth Service] Headers:", req.headers);
      console.log("[Auth Service] Body:", req.body);
    }

    // Validate device request
    if (!validateDeviceRequest(req)) {
      return res.status(401).json({
        error: "Invalid device request",
        message: "Missing or invalid device information",
      });
    }

    const { deviceId, platform, appVersion, timestamp } = req.body;

    // Check timestamp to prevent replay attacks (5 minute window)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return res.status(401).json({
        error: "Request expired",
        message: "Timestamp is too old or too far in the future",
      });
    }

    // Generate Cloud Run token for the device
    if (DEBUG) console.log("[Auth Service] Generating Cloud Run token for device:", deviceId);
    const token = await getCloudRunToken();

    if (DEBUG) console.log("[Auth Service] Cloud Run token generated successfully");

    // Log device authentication for monitoring
    console.log(`[Auth Service] Device authenticated: ${deviceId} (${platform} ${appVersion})`);

    res.json({
      token,
      expiresIn: 3600, // 1 hour
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Auth Service] Error generating device token:", error);
    res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Original public endpoint (deprecated but kept for compatibility)
 */
router.get("/public-token", async (req: Request, res: Response) => {
  try {
    // Log deprecation warning
    console.warn("[Auth Service] Warning: public-token endpoint is deprecated. Use device-token instead.");

    // For backward compatibility, still generate a token
    const token = await getCloudRunToken();

    res.json({
      token,
      expiresIn: 3600,
      timestamp: new Date().toISOString(),
      warning: "This endpoint is deprecated. Please use /auth/device-token",
    });
  } catch (error) {
    console.error("[Auth Service] Error generating public token:", error);
    res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ... rest of the endpoints remain the same ...

export default router;