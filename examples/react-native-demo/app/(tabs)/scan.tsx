import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { useIsFocused } from "@react-navigation/native";
import { Canvas, DiffRect, Paragraph, rect, rrect, Skia, TextAlign } from "@shopify/react-native-skia";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { RelativePathString, router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, LayoutChangeEvent, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";

declare module "react-native" {
    interface View {
        getBoundingClientRect(): DOMRect
    }
}

let scanCounter = 0;

function PermissionsPage({ requestPermission }: { requestPermission: () => void }) {
    const { t } = useTranslation();

    return (
        <KeyboardAwareScreen>
            <Text style={{ textAlign: "center", padding: 10 }}>
                {t("scanTab.permissionsInfo")}
            </Text>
            <Button 
                onPress={requestPermission} 
                title={t("scanTab.grantPermission")}/>
        </KeyboardAwareScreen>
    )
}

function CameraOverlay({width, height, dim, failed}: {width: number, height: number, dim: number, failed: boolean}) {
    const { t } = useTranslation();
    
    const w = width;
    const h = height;
    const d = dim;
    const r = 10

    const outer = rrect(rect(0, 0, w, h), 0, 0);
    const inner = rrect(rect(w/2 - d/2, h/2 - d/2, d, d), r, r)
    
    const border = d + 2;
    const borderOuter = rrect(rect(w/2 - border/2, h/2 - border/2, border, border), r, r);

    const textTopMargin = 12
    const textPosition = h/2 + d/2 + textTopMargin

    const paragraph = useMemo(() => {
        return Skia.ParagraphBuilder.Make({
            textAlign: TextAlign.Center,
            textStyle: {
                fontSize: 18
            }
        })
        .addText(t("scanTab.scanLabel"))
        .build();
    }, [t]);

    const failedParagraph = useMemo(() => {
        return Skia.ParagraphBuilder.Make({
            textAlign: TextAlign.Center,
            textStyle: {
                fontSize: 18,
                color: Skia.Color("red")
            }
        })
        .addText(t("scanTab.scanError"))
        .build();
    }, [t]);


    return (
        <Canvas style={Platform.OS === "android" ? { flex: 1 } : StyleSheet.absoluteFillObject}>
            <DiffRect outer={outer} inner={inner} opacity={0.6}/>
            <DiffRect outer={borderOuter} inner={inner} color={failed ? "red" : "yellow"}/>
            <Paragraph paragraph={failed ? failedParagraph : paragraph} x={0} y={textPosition} width={width}/>
        </Canvas>
    );
}

async function boundsCheck() {

}

async function tryParse(data: string): Promise<RelativePathString> {
    const url = Linking.parse(data);
    const desiredHostname = Constants.expoConfig?.extra?.appLinksUrl;
    if (desiredHostname && url.hostname !== desiredHostname) {
        throw new Error("Invalid URL address in QR code.");
    }

    function validate(id: string) {
        if (!url.queryParams) {
            return "";
        }

        const param = url.queryParams[id];
        if (!param || typeof param != "string") {
            return "";
        }

        return param;
    }

    const deviceId = validate("deviceId");
    const productId = validate("productId");
    const sharedSecret = validate("sharedSecret");

    scanCounter++;
    const params = {deviceId, productId, sharedSecret, scanCounter};

    let result = "";
    for (const [key, value] of Object.entries(params)) {
        result += `${key}=${value}&`
    }

    return `./client?${result}`;
}

export default function Tab() {
    const [permission, requestPermission] = useCameraPermissions();
    const [viewWidth, setViewWidth] = useState(0);
    const [viewHeight, setViewHeight] = useState(0);
    const [failed, setFailed] = useState(false);
    const isFocused = useIsFocused();
    const lock = useRef(false);
    const dim = 280;

    const onLayout = (ev: LayoutChangeEvent) => {
        const {width, height} = ev.nativeEvent.layout;
        setViewHeight(height);
        setViewWidth(width);
    }

    // Unmount camera view when not focused
    if (!isFocused) { return <View/> }

    // Camera permission still loading
    if (!permission) return <View/>

    if (!permission.granted) {
        return <PermissionsPage requestPermission={requestPermission}/>
    }

    return (
        <SafeAreaView style={StyleSheet.absoluteFillObject} onLayout={onLayout}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"]
                }}
                
                onBarcodeScanned={scanResult => {
                    // @TODO: use scanresult.bounds to check if the qr code is inside the rectangular area.
                    const isWithinBounds = true;
                    if (isWithinBounds && scanResult.data && !lock.current) {
                        lock.current = true;
                        setTimeout(async () => {
                            try {
                                await boundsCheck();
                                const link = await tryParse(scanResult.data);
                                router.replace(link);
                                lock.current = false;
                            } catch (err) {
                                if (err instanceof Error) {
                                    console.log(err);
                                }
                                setFailed(true);
                                setTimeout(() => {
                                    setFailed(false);
                                    lock.current = false;
                                }, 2000);
                            }
                        }, 500);
                    }
                }}
            />
            <CameraOverlay width={viewWidth} height={viewHeight} dim={dim} failed={failed} />
        </SafeAreaView>
    )
}