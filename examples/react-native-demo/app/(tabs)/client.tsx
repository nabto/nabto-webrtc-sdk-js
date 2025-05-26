import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import SettingsInput from "@/components/SettingsInput";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useIsFocused } from "@react-navigation/native";
import { Notification, ProgressState, useClientDisplayState } from "@nabto/react-demo-common/react";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Button, Colors, View } from "react-native-ui-lib";
import { RTCView } from "react-native-webrtc";
import { showMessage, MessageType } from "react-native-flash-message";
import { ActivityIndicator } from "react-native";

declare global {
  interface MediaStream {
    toURL(): string
  }
}

type ClientSearchParams = {
  productId?: string,
  deviceId?: string,
  sharedSecret?: string
};

function NotificationTypeToFlashMessageType(notification: Notification): MessageType {
  switch (notification.type) {
    case "error": return "danger";
    case "info": return "info";
    case "success": return "success";
    case "warning": return "warning";
    default: return "default";
  }
}

export default function Tab() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<ClientSearchParams>();
  const endpointUrl = (Constants.expoConfig?.extra?.endpointUrl as string | undefined) ?? "https://eu.webrtc.nabto.net";

  const [progressState, setProgressState] = useState<ProgressState>("disconnected");
  const [deviceId, setDeviceId] = useState("");
  const [productId, setProductId] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");


  //////////////////////////////////////////////////////
  // Connect and disconnect button callbacks
  const onConnectPressed = (d: string, p: string, s: string) => {
    console.log(deviceId, productId, sharedSecret);
    startConnection({
     deviceId: d,
     productId: p,
     sharedSecret: s,
     endpointUrl,
     privateKey: "",
     openVideoStream: true,
     openAudioStream: true,

     // @TODO: Central auth
     clientAccessToken: "",
     requireCentralAuth: false
   });

   AsyncStorage.setItem("device-id", deviceId).catch(_ => null);
   AsyncStorage.setItem("product-id", productId).catch(_ => null);
   AsyncStorage.setItem("shared-secret", sharedSecret).catch(_ => null);
 }

  const onDisconnectPressed = () => {
    stopConnection();
  };

  //////////////////////////////////////////////////////
  // Hooks for query params (universal/app links)
  const loadField = (id: string, param: string | undefined, setField: (v: string) => void) => {
    if (param) {
      setField(param);
    } else {
      AsyncStorage.getItem(id).catch(_ => null).then(s => setField(s ?? ""));
    }
  }

  useEffect(() => {
    loadField("device-id", params.deviceId, setDeviceId);
    loadField("product-id", params.productId, setProductId);
    loadField("shared-secret", params.sharedSecret, setSharedSecret);
  }, [isFocused, params.deviceId, params.productId, params.sharedSecret]);

  useEffect(() => {
    if (params.deviceId && params.productId && params.sharedSecret) {
      onConnectPressed(params.deviceId, params.productId, params.sharedSecret);
    }
  }, [params.deviceId, params.productId, params.sharedSecret]);

  //////////////////////////////////////////////////////
  // Notifications
  const pushNotification = useCallback((notification: Notification) => {
    showMessage({
      message: notification.msg,
      type: NotificationTypeToFlashMessageType(notification),
      duration: 5000
    });
  }, []);

  useEffect(() => {
    if (progressState == "connected") {
      showMessage({
        message: "Connected.",
        type: "success"
      });
    }
  }, [progressState])

  //////////////////////////////////////////////////////
  // Connection state
  const { mediaStream, startConnection, stopConnection } = useClientDisplayState({
    onProgress: setProgressState,
    pushNotification
  });

  return (
    <KeyboardAwareScreen>
      <View style={{
        width: "100%",
        height: 250,
        overflow: "hidden",
        backgroundColor: "black"
      }}>
        <RTCView
          objectFit="cover"
          streamURL={mediaStream?.toURL()}
          style={{
            flex: 1
          }} />

          {progressState == "connecting" ?
            <ActivityIndicator size="large" color="orange" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 2  }}/>
            : undefined
          }
      </View>

      <View style={{
        width: "100%",
        paddingStart: 12,
        paddingEnd: 12,
        marginTop: 24
      }}>

        <SettingsInput value={productId} onChangeText={setProductId} label="Product ID" />
        <SettingsInput value={deviceId} onChangeText={setDeviceId} label="Device ID" />
        <SettingsInput value={sharedSecret} onChangeText={setSharedSecret} label="Shared secret" />

        <View
          style={{
            flexDirection: "row",
            marginTop: 8,
            width: "100%",
            alignItems: "center"
          }}
        >
          <View style={{ flex: 1, margin: 8 }}>
            <Button
              disabled={progressState != "disconnected"}
              onPress={() => onConnectPressed(deviceId, productId, sharedSecret)}
              label="Connect"
              backgroundColor={Colors.orange30}
              borderRadius={8}
            />
          </View>

          <View style={{ flex: 1, margin: 8 }}>
            <Button
              disabled={progressState != "connected"}
              onPress={onDisconnectPressed}
              label="Disconnect"
              backgroundColor={Colors.red30}
              borderRadius={8}
            />
          </View>
        </View>

      </View>
    </KeyboardAwareScreen>
  );
}
