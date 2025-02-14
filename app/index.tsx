import React, { useEffect, useState } from "react";
import { View, Image, FlatList, Button, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const SUPABASE_URL = "https://qaxynrlmloqlqypcmcai.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFheHlucmxtbG9xbHF5cGNtY2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNTczODksImV4cCI6MjA1NDkzMzM4OX0.biLc3PWK3fw2OjLKHN5fVDoc8SKQKUb-GSYYe0l-J7w";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Local Storage Directory
const LOCAL_STORAGE_DIR = FileSystem.documentDirectory + "gallery/";

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadLocalImages();
  }, []);

  // Load images from local storage
  const loadLocalImages = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(LOCAL_STORAGE_DIR);
      setImages(files.map((file) => LOCAL_STORAGE_DIR + file));
    } catch (error) {
      console.log("No images found locally");
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      saveImageLocally(result.assets[0].uri);
    }
  };

  // Save image locally
  const saveImageLocally = async (uri: string) => {
    try {
      await FileSystem.makeDirectoryAsync(LOCAL_STORAGE_DIR, {
        intermediates: true,
      });

      const fileName = uri.split("/").pop();
      const localUri = LOCAL_STORAGE_DIR + fileName;

      await FileSystem.copyAsync({ from: uri, to: localUri });

      setImages((prev) => [...prev, localUri]);
    } catch (error) {
      console.error("Error saving image locally", error);
    }
  };

  // Upload images to Supabase
  const syncWithSupabase = async () => {
    setIsSyncing(true);
    try {
      for (const localUri of images) {
        const fileType = localUri.split(".").pop();
        const uniqueFileName = `${Date.now()}.${fileType}`; // Unique filename

        // Read the file as FormData
        const formData = new FormData();
        formData.append("file", {
          uri: localUri,
          name: uniqueFileName,
          type: `image/${fileType}`,
        });

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("images") // Make sure this matches your Supabase bucket name
          .upload(`${uniqueFileName}`, formData);

        if (error) throw error;
      }

      Alert.alert("Sync complete!");
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Pick an Image" onPress={pickImage} />
      <Button
        title="Sync with Cloud"
        onPress={syncWithSupabase}
        disabled={isSyncing}
      />
      <FlatList
        data={images}
        keyExtractor={(item) => item}
        numColumns={3}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: 100, height: 100, margin: 5 }}
          />
        )}
      />
    </View>
  );
}
