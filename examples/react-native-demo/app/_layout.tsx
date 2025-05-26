import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { registerGlobals } from "react-native-webrtc";
import FlashMessage from "react-native-flash-message";

registerGlobals();

export default function Layout() {

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar backgroundColor="orange"/>
      <GestureHandlerRootView>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
      {/* Global flash message component (required by react-native-flash-message) */}
      <FlashMessage position="top"/>
    </ThemeProvider>
  );
}
