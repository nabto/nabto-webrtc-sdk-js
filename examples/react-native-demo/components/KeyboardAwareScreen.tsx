import { PropsWithChildren } from "react";
import { KeyboardAwareScrollView, View } from "react-native-ui-lib";

export default function KeyboardAwareScreen({ children }: PropsWithChildren<{}>) {
    return (
        <KeyboardAwareScrollView>
            <View
                style={{
                flex: 1,
                alignItems: "center",
                width: "100%",
                marginTop: 50
                }}
            >
                {children}
            </View>
        </KeyboardAwareScrollView>
    )
}