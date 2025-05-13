// app/upload.tsx
import {
  View,
  Button,
  Image,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
import { generateImage } from "@/scripts/api";
import * as Notifications from "expo-notifications";
import {
  setupNotifications,
  showLocalNotification,
  requestFCMPermissions,
  getNotificationData,
} from "@/utils/notificationHelper";

export default function UploadScreen() {
  const { filter } = useLocalSearchParams();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Selecting image...");
  const [hasPermission, setHasPermission] = useState(false);

  // Reference to response listener
  const notificationResponseRef = useRef<Notifications.Subscription>();

  // Set up notifications and response listener
  useEffect(() => {
    // Set up notifications when component mounts
    const initializeNotifications = async () => {
      try {
        await setupNotifications();
        const granted = await requestFCMPermissions();
        setHasPermission(granted);
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // This listener is fired whenever a user taps on a notification
    notificationResponseRef.current =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        try {
          console.log("Notification tapped:", response);

          // Get data from notification
          const data = response.notification.request.content.data;

          // Check if we have a dataKey (for stored image URL)
          if (data?.dataKey) {
            // Retrieve the stored data using the key
            const storedData = await getNotificationData(data.dataKey);
            if (storedData?.imageUrl) {
              // Navigate to result screen when notification is tapped
              router.push({
                pathname: "/result",
                params: { imageUrl: storedData.imageUrl },
              });
              return;
            }
          }

          // For other notification types, just navigate to home
          if (data?.notificationType === "image_ready" && !data?.dataKey) {
            router.push("/");
          }
        } catch (error) {
          console.error("Error handling notification tap:", error);
        }
      });

    // Check initial permission status
    async function checkPermissions() {
      try {
        const result = await requestFCMPermissions();
        setHasPermission(result);
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    }
    checkPermissions();

    // Cleanup
    return () => {
      if (notificationResponseRef.current) {
        Notifications.removeNotificationSubscription(
          notificationResponseRef.current
        );
      }
    };
  }, []);

  const pickImage = async () => {
    try {
      // Request permissions first (important for Android)
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "You need to grant camera roll permissions to upload images"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        console.log(`Selected image: ${uri}`);
        console.log(`Image type: ${uri.split(".").pop()}`);
        setImageUri(uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  const processImage = async () => {
    if (!imageUri) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    setLoading(true);
    setLoadingMessage("Uploading image...");

    try {
      // Get FCM token for notification - only attempt for native platforms
      let fcmToken = null;
      if (Platform.OS !== "web") {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `AI Filter: ${filter}`,
              body: `Processing your image with the ${filter} filter. This may take a moment...`,
              data: {
                notificationType: "processing",
                filterType: filter,
              },
              // Specify the correct channel ID for Android
              ...(Platform.OS === "android"
                ? { channelId: "status-updates" }
                : {}),
            },
            trigger: null,
          });
        } catch (error) {
          console.log("Could not schedule notification, continuing without it");
        }
      }

      // Show processing notification
      if (Platform.OS !== "web" && fcmToken) {
        await showLocalNotification(
          `AI Filter: ${filter}`,
          `Processing your image with the ${filter} filter. This may take a moment...`
        );
      }

      // Log the filter being applied
      console.log(`Applying ${filter} filter to image...`);
      setLoadingMessage(`Applying ${filter} filter effect...`);

      // Process the image with the selected filter
      const result = await generateImage(
        imageUri,
        String(filter),
      );

      // Navigate to results screen
      setLoadingMessage("Success! Redirecting to results...");
      router.push({ pathname: "/result", params: { imageUrl: result } });
    } catch (error: any) {
      console.error("API Error:", error);

      // Create a more user-friendly error message
      let errorMessage = "Failed to process image. Please try again.";

      if (error.message) {
        if (
          error.message.includes("fetch") ||
          error.message.includes("Network")
        ) {
          errorMessage =
            "Network error: Could not connect to the server. Please check that:\n\n" +
            "1. The server is running\n" +
            "2. Your phone is connected to the same network as the server\n" +
            "3. You are using the correct server address";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. The server may be slow or unreachable. Please try again or check your server.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Connection Error", errorMessage, [
        {
          text: "OK",
          onPress: () => setLoading(false),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
          <Text style={styles.subText}>This may take up to 30 seconds</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Text style={styles.filterText}>
            Selected filter:{" "}
            <Text style={styles.filterHighlight}>{filter}</Text>
          </Text>

          <Button title="Pick Image" onPress={pickImage} />

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <Button title="Apply Filter" onPress={processImage} />

              {!hasPermission && (
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={async () => {
                    const granted = await requestFCMPermissions();
                    setHasPermission(granted);
                  }}
                >
                  <Text style={styles.notificationButtonText}>
                    Enable Notifications
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                Select an image to continue
              </Text>
            </View>
          )}

          <Text style={styles.instructions}>
            Select an image to apply the {filter} filter
          </Text>
        </View>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  contentContainer: {
    alignItems: "center",
    width: "100%",
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  previewImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
    borderRadius: 10,
  },
  placeholderContainer: {
    width: 250,
    height: 250,
    marginVertical: 20,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ccc",
    borderStyle: "dashed",
  },
  placeholderText: {
    color: "#666",
    textAlign: "center",
    padding: 20,
  },
  filterText: {
    fontSize: 16,
    marginBottom: 20,
  },
  filterHighlight: {
    fontWeight: "bold",
    color: "#0000ff",
  },
  instructions: {
    marginTop: 15,
    color: "#666",
    textAlign: "center",
  },
  notificationButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  notificationButtonText: {
    color: "#0000ff",
  },
});
