// pixmix-frontend/app/debug.tsx
import { View, Text, Button, ScrollView, StyleSheet } from "react-native";
import { useState } from "react";
import { 
  testAuthenticationFlow, 
  getGoogleIdentityToken,
  getCloudRunToken,
  getCachedCloudRunToken,
  clearTokenCache,
  getCurrentUserId
} from "@/services/authService";
import { testAPIConnection } from "@/scripts/api";

export default function DebugScreen() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testGoogleIdentityToken = async () => {
    try {
      addLog("Testing Google Identity Token...");
      const token = await getGoogleIdentityToken();
      addLog(`Success: Token obtained (${token.substring(0, 20)}...)`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const testCloudRunToken = async () => {
    try {
      addLog("Testing Cloud Run Token...");
      const token = await getCloudRunToken();
      addLog(`Success: Token obtained (${token.substring(0, 20)}...)`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const testCachedToken = async () => {
    try {
      addLog("Testing Cached Token...");
      const token = await getCachedCloudRunToken();
      addLog(`Success: Cached token obtained (${token.substring(0, 20)}...)`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const testFullFlow = async () => {
    try {
      addLog("Testing Full Authentication Flow...");
      const result = await testAuthenticationFlow();
      addLog(`Full flow result: ${result ? "Success" : "Failed"}`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const testAPI = async () => {
    try {
      addLog("Testing API Connection...");
      const result = await testAPIConnection();
      addLog(`API connection: ${result ? "Success" : "Failed"}`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  const getUserId = async () => {
    try {
      addLog("Getting User ID...");
      const userId = await getCurrentUserId();
      addLog(`User ID: ${userId}`);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Authentication Debug</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Google Identity Token" onPress={testGoogleIdentityToken} />
        <Button title="Test Cloud Run Token" onPress={testCloudRunToken} />
        <Button title="Test Cached Token" onPress={testCachedToken} />
        <Button title="Clear Token Cache" onPress={() => { clearTokenCache(); addLog("Token cache cleared"); }} />
        <Button title="Test Full Auth Flow" onPress={testFullFlow} />
        <Button title="Test API Connection" onPress={testAPI} />
        <Button title="Get User ID" onPress={getUserId} />
        <Button title="Clear Logs" onPress={clearLogs} />
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logEntry}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  logContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: "monospace",
  },
});