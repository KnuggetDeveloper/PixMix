// pixmix-frontend/app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import ErrorBoundary from "@/components/ErrorBoundary";
import * as Notifications from "expo-notifications";
import {
  getNotificationData,
  setupNotifications,
} from "@/utils/notificationHelper";
import { 
  getCurrentUserId, 
  testAuthenticationFlow 
} from "@/services/authService";
import { useColorScheme } from "@/hooks/useColorScheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize app and authentication
  useEffect(() => {
    async function initializeApp() {
      try {
        console.log("[App] Starting initialization...");

        // Step 1: Get or create user ID
        const userId = await getCurrentUserId();
        console.log("[App] User ID:", userId);

        // Step 2: Test authentication flow (in development)
        if (__DEV__) {
          console.log("[App] Testing authentication flow...");
          const authTest = await testAuthenticationFlow();
          if (!authTest) {
            console.warn("[App] Authentication test failed");
          }
        }

        // Step 3: Setup notifications
        const notificationSetup = await setupNotifications(userId || "");
        if (notificationSetup) {
          console.log("[App] Notifications initialized successfully");
        } else {
          console.log("[App] Notifications setup failed or denied");
        }

        setIsReady(true);
      } catch (error) {
        console.error("[App] Error initializing app:", error);
        setIsReady(true); // Allow app to continue even if initialization fails
      }
    }

    initializeApp();

    // Set up notification tap handler
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          console.log("[App] Notification tapped:", response);

          const data = response.notification.request.content.data;

          // Check if we have a dataKey (for stored image URL)
          if (data?.dataKey) {
            const storedData = await getNotificationData(data.dataKey);
            if (storedData?.imageUrl) {
              router.push({
                pathname: "/result",
                params: { imageUrl: storedData.imageUrl },
              });
              return;
            }
          }

          // Direct imageUrl in the data
          if (data?.imageUrl) {
            router.push({
              pathname: "/result",
              params: { imageUrl: data.imageUrl },
            });
          }
        } catch (error) {
          console.error("[App] Error handling notification tap:", error);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  if (!loaded || !isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen name="upload" options={{ title: "Upload" }} />
          <Stack.Screen name="result" options={{ title: "Result" }} />
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}