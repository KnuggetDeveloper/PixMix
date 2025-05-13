import { Router, Request, Response } from "express";
import { getCloudRunToken, getFCMAuthToken } from "../utils/google-auth";
import { verifyFirebaseToken } from "../middleware/firebase";

const router = Router();

/**
 * Public endpoint to get Cloud Run token
 * Requires Google Identity token (validated at Cloud Run level)
 */
router.get("/public-token", async (req: Request, res: Response) => {
  try {
    const token = await getCloudRunToken();
    res.json({
      token,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error("Error generating public token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * Firebase-authenticated endpoint for getting tokens
 * Requires Firebase authentication
 */
router.get("/token", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const token = await getCloudRunToken();
    res.json({
      token,
      expiresIn: 3600,
      userId: req.user?.uid,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * Generate FCM authorization token for notifications
 */
router.get("/fcm-token", async (req: Request, res: Response) => {
  try {
    const token = await getFCMAuthToken();
    res.json({ token });
  } catch (error) {
    console.error("Error generating FCM token:", error);
    res.status(500).json({ error: "Failed to generate FCM token" });
  }
});

export default router;