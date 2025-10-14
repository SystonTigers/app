// src/app.tsx  (or App.tsx if that's your file)
import React, { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Provider as PaperProvider, Button, ActivityIndicator } from "react-native-paper";

function Home() {
  const insets = useSafeAreaInsets();

  // DEMO LOGS — you should see these in your Expo terminal or JS debugger
  useEffect(() => {
    console.log("🔌 Field Drop mounted");
    return () => console.log("🔌 Field Drop unmounted");
  }, []);

  const onPress = () => {
    console.log("🧪 Button pressed!");
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        backgroundColor: "#0B1220",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "700" }}>Field Drop</Text>
        <Text style={{ color: "#9BB3C7", fontSize: 15 }}>Expo SDK 54 • Starter Screen</Text>
      </View>

      <ActivityIndicator animating size="large" />

      <Button mode="contained" onPress={onPress}>
        Tap to log something
      </Button>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar barStyle="light-content" />
        <Home />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
