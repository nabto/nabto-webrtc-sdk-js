import SettingsInput from '@/components/SettingsInput';
import { useEffect, useState } from 'react';
import { View, Button, Colors } from "react-native-ui-lib";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProgressState, SettingsValues, useDeviceDisplayState } from "@nabto/react-demo-common/react";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';

export default function Tab() {
  const [settings, setSettings] = useState<SettingsValues>();

  // Connectivity state
  const [progressState, setProgressState] = useState<ProgressState>("disconnected");

  const [deviceId, setDeviceId] = useState("");
  const [productId, setProductId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("https://eu.webrtc.dev.nabto.net")

  useEffect(() => {
    AsyncStorage.getItem("d-device-id").catch(_ => null).then(s => setDeviceId(s ?? ""))
    AsyncStorage.getItem("d-product-id").catch(_ => null).then(s => setProductId(s ?? ""))
    AsyncStorage.getItem("d-private-key").catch(_ => null).then(s => setPrivateKey(s ?? ""))
    AsyncStorage.getItem("d-shared-secret").catch(_ => null).then(s => setSharedSecret(s ?? ""))
    AsyncStorage.getItem("d-endpoint-url").catch(_ => null).then(s => setEndpointUrl(s ?? "https://eu.webrtc.dev.nabto.net"))
  }, [])

  // Update async storage
  useEffect(() => {
    if (settings) {
      AsyncStorage.setItem("d-device-id", deviceId).catch(_ => null)
      AsyncStorage.setItem("d-product-id", productId).catch(_ => null)
      AsyncStorage.setItem("d-private-key", privateKey).catch(_ => null)
      AsyncStorage.setItem("d-shared-secret", sharedSecret).catch(_ => null)
      AsyncStorage.setItem("d-endpoint-url", endpointUrl).catch(_ => null)
    }
  }, [settings]);

  const { mediaStream } = useDeviceDisplayState({
    useAudio: true,
    useVideo: true,
    onProgress: setProgressState
  });

  const onConnectPressed = () => {
    setSettings({
      deviceId,
      productId,
      endpointUrl,
      sharedSecret,
      privateKey,
      openAudioStream: true,
      openVideoStream: true,

      // @TODO: central auth
      clientAccessToken: "",
      requireCentralAuth: false
    })
  }
  const onDisconnectPressed = () => {
    setSettings(undefined);
  }

  return (
    <KeyboardAwareScreen>
      <View style={{
        width: "100%",
        paddingStart: 12,
        paddingEnd: 12,
        marginTop: 24
      }}>
        <SettingsInput value={productId} onChangeText={setProductId} label="Product ID" />
        <SettingsInput value={deviceId} onChangeText={setDeviceId} label="Device ID" />
        <SettingsInput multiline value={privateKey} onChangeText={setPrivateKey} label="Private Key" />
        <SettingsInput value={sharedSecret} onChangeText={setSharedSecret} label="Shared secret" />
        <SettingsInput value={endpointUrl} onChangeText={setEndpointUrl} label="Endpoint URL" />

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
              onPress={onConnectPressed}
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
