// app/_layout.tsx
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirebase } from "@/utils/firebaseInit";

import { useColorScheme } from "@/hooks/useColorScheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Setup notification handling
  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize Firebase first
        await initializeFirebase();

        // Get or create user ID
        let storedUserId = await AsyncStorage.getItem("user_id");
        if (!storedUserId) {
          // Generate a simple user ID for demo purposes
          storedUserId = `user_${Date.now()}`;
          await AsyncStorage.setItem("user_id", storedUserId);
        }
        setUserId(storedUserId);

        // Setup notifications and register device
        const success = await setupNotifications(storedUserId);
        if (success) {
          console.log("Notifications initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing app:", error);
      }
    }

    initializeApp();

    // Set up notification tap handler
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          console.log("Notification tapped:", response);

          const data = response.notification.request.content.data;

          // Check if we have a dataKey (for stored image URL)
          if (data?.dataKey) {
            const storedData = await getNotificationData(data.dataKey);
            if (storedData?.imageUrl) {
              // Navigate to result screen
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
          console.error("Error handling notification tap:", error);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
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
