// app/result.tsx
import { View, Image, Text, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useState, useEffect } from 'react';

export default function ResultScreen() {
  const { imageUrl } = useLocalSearchParams();
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Validate and handle imageUrl when component mounts
  useEffect(() => {
    if (!imageUrl) {
      Alert.alert(
        "Error", 
        "No image URL provided", 
        [{ text: "Go Back", onPress: () => router.replace('/') }]
      );
      setError(true);
    }
  }, [imageUrl, router]);

  // Function to handle image load success
  const handleImageLoad = () => {
    setLoading(false);
  };

  // Function to handle image load error
  const handleImageError = () => {
    setLoading(false);
    setError(true);
    Alert.alert(
      "Error",
      "Could not load the image. The URL might be invalid or the image is no longer available.",
      [{ text: "Go Back", onPress: () => router.replace('/') }]
    );
  };

  // Function to share the generated image
  const shareImage = async () => {
    try {
      setSharing(true);
      
      if (!imageUrl) {
        throw new Error("No image URL to share");
      }
      
      // For data URLs, we need to download the image first
      if (imageUrl.toString().startsWith('data:')) {
        const base64Data = imageUrl.toString().split(',')[1];
        const fileUri = FileSystem.documentDirectory + 'filtered_image.png';
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        
        // Share the downloaded file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your filtered image',
        });
      } else {
        // For regular URLs, download first then share
        const downloadResumable = FileSystem.createDownloadResumable(
          imageUrl.toString(),
          FileSystem.documentDirectory + 'filtered_image.png'
        );
        
        const result = await downloadResumable.downloadAsync();
        
        if (!result || !result.uri) {
          throw new Error("Failed to download image");
        }
        
        // Share the downloaded file
        await Sharing.shareAsync(result.uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your filtered image',
        });
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert("Error", "Could not share the image. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  // Function to go back to filters
  const goToHome = () => {
    router.replace('/');
  };

  // If there's an error, don't try to render the image
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Something went wrong loading the image.</Text>
        <Button title="Go Back" onPress={goToHome} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Generated Image</Text>
      
      <View style={styles.imageWrapper}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}
        
        {imageUrl && (
          <Image 
            source={{ uri: String(imageUrl) }} 
            style={styles.image}
            onLoad={handleImageLoad}
            onError={handleImageError} 
          />
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title={sharing ? "Sharing..." : "Share Image"} 
          onPress={shareImage} 
          disabled={sharing || loading || error}
        />
        <Button 
          title="Create Another" 
          onPress={goToHome} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  imageWrapper: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  }
});