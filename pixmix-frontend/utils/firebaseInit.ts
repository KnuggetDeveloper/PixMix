// utils/firebaseInit.ts
import { Platform } from "react-native";
import { LogBox } from "react-native";
import Constants from "expo-constants";
// Ignore specific Firebase warnings
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native",
  "Setting a timer for a long period of time",
]);
const ENV = {
  FIREBASE_API_KEY:
    Constants.expoConfig?.extra?.firebaseApiKey ||
    "AIzaSyBp_JPcbkcyX38Cyo-XK2dNcsX-AJ7jLSI",
  FIREBASE_PROJECT_ID:
    Constants.expoConfig?.extra?.firebaseProjectId || "pixmix-6a12e",
  FIREBASE_APP_ID:
    Constants.expoConfig?.extra?.firebaseAppId ||
    "1:493914627855:android:e06a602407c8f6c126687a",
};
let isInitialized = false;

export async function initializeFirebase() {
  // Skip if already initialized or on web platform
  if (isInitialized || Platform.OS === "web") {
    return;
  }

  try {
    // Only import Firebase on native platforms
    const firebase = require("@react-native-firebase/app").default;
    const auth = require("@react-native-firebase/auth").default;

    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
      // For development purposes, we're using the google-services.json file
      // that's already in the project
      await firebase.initializeApp();
      console.log("Firebase has been initialized successfully");

      // Initialize auth module
      await auth();
      console.log("Firebase Auth has been initialized successfully");

      // Set up anonymous auth if no user is logged in
      // This is needed to get Firebase tokens for authentication
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log("No user is signed in, attempting anonymous sign-in");
        try {
          await auth().signInAnonymously();
          console.log("Anonymous authentication successful");
        } catch (authError) {
          console.error("Anonymous authentication failed:", authError);
        }
      } else {
        console.log("User is already signed in:", currentUser.uid);
      }
    } else {
      console.log("Firebase was already initialized");
    }

    isInitialized = true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

/**
 * Gets a Firebase ID token
 * This can be used for authentication with backends that support Firebase Auth
 */
export async function getFirebaseToken(): Promise<string> {
  try {
    // Ensure Firebase is initialized
    await initializeFirebase();

    const auth = require("@react-native-firebase/auth").default;

    // Ensure a user is signed in
    if (!auth().currentUser) {
      console.log("No user signed in, signing in anonymously");
      await auth().signInAnonymously();
    }

    // Get the ID token
    const token = (await auth().currentUser?.getIdToken(true)) || "";
    console.log("Generated Firebase ID token");

    return token;
  } catch (error) {
    console.error("Error getting Firebase token:", error);
    return "";
  }
}
