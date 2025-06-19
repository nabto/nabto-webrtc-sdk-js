import "react-native-get-random-values";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { registerGlobals } from "react-native-webrtc";
import { NotifierWrapper } from "react-native-notifier";
import { initReactI18next } from "react-i18next";
import i18n from "i18next";

import translationEN from "../locales/english.json";

registerGlobals();

const resources = {
  en: { translation: translationEN }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default function Layout() {

  return (
    <GestureHandlerRootView>
      <NotifierWrapper>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar backgroundColor="orange" />
          <GestureHandlerRootView>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </GestureHandlerRootView>
        </ThemeProvider>
      </NotifierWrapper>
    </GestureHandlerRootView>
  );
}
