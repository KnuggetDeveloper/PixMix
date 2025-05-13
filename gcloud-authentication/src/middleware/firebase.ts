import admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check if Firebase environment variables are set
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKeyRaw) {
  console.error("Missing Firebase credentials in environment variables:");
  console.error(`  FIREBASE_PROJECT_ID: ${projectId ? "Set" : "Missing"}`);
  console.error(`  FIREBASE_CLIENT_EMAIL: ${clientEmail ? "Set" : "Missing"}`);
  console.error(`  FIREBASE_PRIVATE_KEY: ${privateKeyRaw ? "Set" : "Missing"}`);
  throw new Error(
    "Firebase configuration is incomplete. Check your environment variables."
  );
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    throw error;
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

/**
 * Middleware to verify Firebase authentication token
 */
export function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const idToken = authHeader.split("Bearer ")[1];

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      next();
    })
    .catch((error) => {
      console.error("Error verifying Firebase token:", error);
      res.status(403).json({ error: "Unauthorized: Invalid token" });
    });
}
