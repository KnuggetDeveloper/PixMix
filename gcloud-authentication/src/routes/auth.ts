// gcloud-authentication/src/routes/auth.ts
import { Router, Request, Response } from "express";
import { getCloudRunToken, getFCMAuthToken } from "../utils/google-auth";
import { verifyFirebaseToken } from "../middleware/firebase";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";

const router = Router();

// Debug logging
const DEBUG = true;

// Create a Google auth client for identity tokens
const googleAuth = new GoogleAuth({
  credentials: {
    client_email: process.env.CLOUD_RUN_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.CLOUD_RUN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/**
 * Public endpoint to get Cloud Run token
 * Requires Google Identity token (validated at Cloud Run level)
 */
router.get("/public-token", async (req: Request, res: Response) => {
  try {
    if (DEBUG) {
      console.log("[Auth Service] Public token requested");
      console.log("[Auth Service] Headers:", req.headers);
    }

    // The Google Identity token validation happens at Cloud Run level
    // If we reach here, the token is already validated by Cloud Run
    if (DEBUG)
      console.log("[Auth Service] Identity token validated by Cloud Run");

    // Generate Cloud Run token
    if (DEBUG) console.log("[Auth Service] Generating Cloud Run token...");
    const token = await getCloudRunToken();

    if (DEBUG)
      console.log("[Auth Service] Cloud Run token generated successfully");

    res.json({
      token,
      expiresIn: 3600, // 1 hour
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Auth Service] Error generating public token:", error);
    res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Firebase-authenticated endpoint for getting tokens
 * Requires Firebase authentication
 */
router.get(
  "/token",
  verifyFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      if (DEBUG) {
        console.log("[Auth Service] Firebase authenticated token requested");
        console.log("[Auth Service] User ID:", req.user?.uid);
      }

      const token = await getCloudRunToken();

      res.json({
        token,
        expiresIn: 3600,
        userId: req.user?.uid,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Auth Service] Error generating Firebase token:", error);
      res.status(500).json({
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Generate FCM authorization token for notifications
 */
router.get("/fcm-token", async (req: Request, res: Response) => {
  try {
    if (DEBUG) console.log("[Auth Service] FCM token requested");

    const token = await getFCMAuthToken();

    if (DEBUG) console.log("[Auth Service] FCM token generated successfully");

    res.json({
      token,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Auth Service] Error generating FCM token:", error);
    res.status(500).json({
      error: "Failed to generate FCM token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Endpoint to generate a fresh Google Identity token
 * This works around the issue of expiring tokens
 */
router.get("/identity-token", async (req: Request, res: Response) => {
  try {
    if (DEBUG) {
      console.log("[Auth Service] Identity token requested");
    }

    // For production, we need to use a different approach since getIdToken
    // is not available on the client. Let's use signJwt instead.
    const client = await googleAuth.getClient();
    const email = process.env.CLOUD_RUN_SERVICE_ACCOUNT_EMAIL;
    const audience = `https://gcloud-authentication-493914627855.us-central1.run.app`;

    // Create a JWT token for the service account
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: email,
      sub: email,
      aud: audience,
      iat: now,
      exp: now + 3600, // 1 hour expiration
    };

    // Sign with the service account credentials
    // This is a simple JWT creation - for a real app use library methods
    // that handle this more securely
    const privateKey = process.env.CLOUD_RUN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!privateKey) {
      throw new Error("CLOUD_RUN_PRIVATE_KEY is not configured");
    }

    const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

    if (DEBUG)
      console.log("[Auth Service] Identity token generated successfully");

    res.json({
      token,
      expiresIn: 3600, // 1 hour
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Auth Service] Error generating identity token:", error);
    res.status(500).json({
      error: "Failed to generate identity token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "gcloud-authentication",
    timestamp: new Date().toISOString(),
  });
});

export default router;
