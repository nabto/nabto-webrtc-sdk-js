import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import SettingsInput from "@/components/SettingsInput";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClientState } from "@nabto/react-demo-common";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, useCallback, EffectCallback, DependencyList } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, AppState, Text, Button, View } from "react-native";
import { Notifier, NotifierComponents } from "react-native-notifier";
import { RTCView } from "react-native-webrtc";
import { SignalingError, SignalingErrorCodes } from "@nabto/webrtc-signaling-client";
import AntDesign from "@expo/vector-icons/AntDesign";
import UniversalLinkSupportModule from "@/modules/universal-link-support/src/UniversalLinkSupportModule";
import * as Linking from "expo-linking";

declare global {
  interface MediaStream {
    toURL(): string
  }
}

type ClientSearchParams = {
  productId?: string,
  deviceId?: string,
  sharedSecret?: string,
  scanCounter?: string
};

function StatusLabel({label, status}: {label: string, status: string}) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={{flex: 1}}>{label}</Text>
      <Text>{status}</Text>
    </View>
  )
}

function VideoDisconnectedLabel() {
  const { t } = useTranslation();

  return (
    <View style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 1,
    }}>
      <View style={{
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}>
        <View style={{ backgroundColor: "red", borderRadius: 12, padding: 12, flexDirection: "row" }}>
          <AntDesign name="disconnect" size={24} />
          <Text
            style={{
              marginStart: 4,
              color: "black",
              fontSize: 16,
              alignSelf: "center"
            }}
          >
            {t("clientTab.streamOffline")}
          </Text>
        </View>
      </View>
    </View>
  )
}

function VideoSpinner() {
  return (<ActivityIndicator size="large" color="orange" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 2  }}/>);
}

function SignalingErrorToText(err: Error, t: (s: string) => string): string {
  if (err instanceof SignalingError) {
    switch (err.errorCode) {
      case SignalingErrorCodes.VERIFICATION_ERROR: return t("clientTab.verificationError");
    }
    return err.errorMessage ?? err.errorCode;
  } else {
    return err.message;
  }
}

function useCompareEffect(
  effect: EffectCallback,
  compareDeps: DependencyList,
  staticDeps: DependencyList
) {
  const ref = useRef<DependencyList>();

  if (!ref.current || !compareDeps.every((dep, i) => Object.is(dep, ref.current?.[i]))) {
    ref.current = [...compareDeps, ...staticDeps]
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useEffect(effect, ref.current);
}

export default function Tab() {
  const { t } = useTranslation();

  const appState = useRef(AppState.currentState);
  const localSearchParams = useLocalSearchParams<ClientSearchParams>();
  const scanCounter = Number(localSearchParams.scanCounter);

  const [deviceId, setDeviceId] = useState("");
  const [productId, setProductId] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");

  //////////////////////////////////////////////////////
  // Connection state
  const {
    mediaStream,
    progressState,
    startConnection,
    stopConnection,

    // Connection states
    signalingConnectionState,
    signalingPeerState,
    rtcConnectionState,
    rtcSignalingState,

    // Error states
    createClientError,
    createPeerConnectionError,
    peerConnectionError,
    signalingError
  } = useClientState({
    onProgress: (progress) => {}
  });

  useEffect(() => {
    const listener = AppState.addEventListener("change", nextAppState => {
      if (appState.current === "active" && nextAppState !== "active") {
        stopConnection();
      }
    });

    return () => listener.remove();
  }, [stopConnection]);

  //////////////////////////////////////////////////////
  // Connect and disconnect button callbacks
  const onConnectPressed = useCallback((d: string, p: string, s: string) => {
    console.log("onconnectpressed called")
    startConnection({
     deviceId: d,
     productId: p,
     sharedSecret: s,
     endpointUrl: `https://${p}.webrtc.nabto.net`,
     privateKey: "",
     openVideoStream: true,
     openAudioStream: true,
     requireOnline: true,

     // @TODO: Central auth
     clientAccessToken: "",
     requireCentralAuth: false
   });

   AsyncStorage.setItem("device-id", d).catch(_ => null);
   AsyncStorage.setItem("product-id", p).catch(_ => null);
   AsyncStorage.setItem("shared-secret", s).catch(_ => null);
 }, [startConnection]);

  const onDisconnectPressed = useCallback(() => {
    stopConnection();
  }, [stopConnection]);

  //////////////////////////////////////////////////////
  // universal link handling

  const tryParseAndConnect = useCallback((url: string) => {
    const parsed = Linking.parse(url)
    const validate = (id: string) => {
      const param = parsed.queryParams?.[id];
      return (!param || typeof param != "string") ? undefined : param;
    }

    const deviceId = validate("deviceId");
    const productId = validate("productId");
    const sharedSecret = validate("sharedSecret");


    if (deviceId && productId && sharedSecret) {
      setDeviceId(deviceId);
      setProductId(productId);
      setSharedSecret(sharedSecret);
      console.log("tryparseandconnect called onconnectpressed")
      onConnectPressed(deviceId, productId, sharedSecret);
    }
  }, [onConnectPressed]);

  useCompareEffect(() => {
    Promise.all([
      AsyncStorage.getItem("device-id").catch(_ => "").then(s => setDeviceId(s ?? "")),
      AsyncStorage.getItem("product-id").catch(_ => "").then(s => setProductId(s ?? "")),
      AsyncStorage.getItem("shared-secret").catch(_ => "").then(s => setSharedSecret(s ?? ""))
    ]).then(() => {
      const universalLink = UniversalLinkSupportModule.getInitialUniversalLink()
      if (universalLink) {
        tryParseAndConnect(universalLink);
      }
    });
  }, [], [tryParseAndConnect]);

  useEffect(() => {
    const eventsub = UniversalLinkSupportModule.addListener("onUniversalLink", params => {
      if (params.data) {
        tryParseAndConnect(params.data);
      }
    });

    return () => {
      eventsub.remove();
    }
  }, [tryParseAndConnect]);

  useCompareEffect(() => {
    if (scanCounter > 0) {
      if (localSearchParams.deviceId && localSearchParams.productId && localSearchParams.sharedSecret) {
        setDeviceId(localSearchParams.deviceId);
        setProductId(localSearchParams.productId);
        setSharedSecret(localSearchParams.sharedSecret);
        console.log("scancounter useffect called onconnectpressed")
        onConnectPressed(localSearchParams.deviceId, localSearchParams.productId, localSearchParams.sharedSecret);
      }
    }
  }, [scanCounter], [localSearchParams.deviceId, localSearchParams.productId, localSearchParams.sharedSecret, onConnectPressed])

  useEffect(() => {
    if (signalingError || createClientError || createPeerConnectionError || peerConnectionError) {
      const title =
        signalingError ? "Signaling failed" :
        createClientError ? "Could not start signaling client" :
        createPeerConnectionError ? "Failed to create Peer Connection" :
        peerConnectionError ? "RTC Peer Connection Error" : undefined;
      const description =
        signalingError ? SignalingErrorToText(signalingError, t) :
        createClientError?.message ??
        createPeerConnectionError?.message ??
        peerConnectionError?.message ??
        undefined;
      Notifier.showNotification({
        title,
        description,
        duration: 0,
        Component: NotifierComponents.Alert,
        componentProps: {
          alertType: "error"
        }
      })
    } else {
     Notifier.hideNotification();
    }
  }, [signalingError, createClientError, createPeerConnectionError, peerConnectionError, t]);

  return (
    <KeyboardAwareScreen>
      <View style={{
        width: "100%",
        height: 250
      }}>
        <RTCView
          objectFit="contain"
          streamURL={mediaStream?.toURL()}
          style={{
            flex: 1
          }}>
        </RTCView>

          {
            progressState === "connecting" ? <VideoSpinner/> :
            progressState === "disconnected" ? <VideoDisconnectedLabel/> :
            undefined
          }
      </View>

      <View style={{
        width: "100%",
        paddingStart: 12,
        paddingEnd: 12,
        marginTop: 12
      }}>
        <StatusLabel label={t("clientTab.rtcConnectionState")} status={rtcConnectionState?.toUpperCase() ?? "N/A"}/>
        <StatusLabel label={t("clientTab.rtcSignalingState")} status={rtcSignalingState?.toUpperCase() ?? "N/A"}/>
        <StatusLabel label={t("clientTab.signalingConnectionState")} status={signalingConnectionState?.toUpperCase() ?? "N/A"}/>
        <StatusLabel label={t("clientTab.signalingPeerState")} status={signalingPeerState?.toUpperCase() ?? "N/A"} />

        <View style={{height: 8}} />

        <View style={{ gap: 8 }}>
          <SettingsInput value={productId} onChangeText={setProductId} label={t("productId")}/>
          <SettingsInput value={deviceId} onChangeText={setDeviceId} label={t("deviceId")} />
          <SettingsInput value={sharedSecret} onChangeText={setSharedSecret} label={t("sharedSecret")} />
        </View>

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
              color="orange"
              disabled={progressState !== "disconnected"}
              onPress={() => onConnectPressed(deviceId, productId, sharedSecret)}
              title={t("connect")}
            />
          </View>

          <View style={{ flex: 1, margin: 8 }}>
            <Button
              color="orange"
              disabled={progressState !== "connected"}
              onPress={onDisconnectPressed}
              title={t("disconnect")}
            />
          </View>
        </View>

      </View>
    </KeyboardAwareScreen>
  );
}
