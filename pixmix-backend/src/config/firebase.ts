import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.production" });

// Check if required Firebase credentials exist
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

export const firestore = admin.firestore();
export const messaging = admin.messaging();
