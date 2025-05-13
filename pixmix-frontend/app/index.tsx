// app/index.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  setupNotifications,
  requestFCMPermissions,
} from "@/utils/notificationHelper";
import { useEffect } from "react";

const filters = ["Ghibli", "Pixar", "Sketch", "Cyberpunk"];

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    async function initializeNotifications() {
      try {
        console.log("Setting up notifications...");
        await setupNotifications();
        // Request permissions on app start
        const granted = await requestFCMPermissions();
        console.log(
          "Notification permission status:",
          granted ? "Granted" : "Denied"
        );
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    }
    initializeNotifications();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Style Generator</Text>
      <Text style={styles.subtitle}>Choose a Style:</Text>

      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={styles.filterButton}
            onPress={() =>
              router.push({ pathname: "/upload", params: { filter } })
            }
          >
            <Text style={styles.filterButtonText}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.instructions}>
        Select a style to generate an AI image!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: "column",
    justifyContent: "center",
    width: "80%",
    gap: 10,
  },
  filterButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
  },
  testButton: {
    backgroundColor: "#FF6B6B",
    marginTop: 20,
    width: "80%",
  },
  filterButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
  },
});
