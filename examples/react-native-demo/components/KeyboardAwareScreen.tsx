import { PropsWithChildren } from "react";
import { View, ScrollView, KeyboardAvoidingView } from "react-native";

export default function KeyboardAwareScreen({ children }: PropsWithChildren<object>) {
    return (
        <KeyboardAvoidingView style={{ flex: 1, flexDirection: 'column', justifyContent: 'center'}} behavior="padding" enabled keyboardVerticalOffset={100}>
            <ScrollView>
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    {children}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}