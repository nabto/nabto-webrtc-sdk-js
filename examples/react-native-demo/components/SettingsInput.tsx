import { useState } from "react";
import { StyleSheet, TextInput, Text, View } from "react-native";

const styles = StyleSheet.create({
    textInput: {
        width: "100%",
        height: "100%",
        fontSize: 16,
        fontWeight: "400",
        marginStart: 8,
        marginEnd: 8
    },
    labelContainer: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0
    },
    largeLabel: {
        width: "100%",
        height: "100%",
        textAlignVertical: "center",
        marginStart: 8,
        fontSize: 16,
        fontWeight: "400",
        color: "rgba(0,0,0,0.4)"
    },
    label: {
        marginStart: 8,
        fontSize: 11
    },
    labelActive: {
        color: "orange"
    },
    inputContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.02)",
        borderBottomColor: "rgba(0,0,0,0.4)",
        borderBottomWidth: 1
    },
    inputContainerActive: {
        borderBottomColor: "orange"
    },
    container: {
        width: "100%",
        height: 56
    }
})

export default function SettingsInput({label, value, onChangeText, multiline}: {label: string, value: string, onChangeText: (text: string) => void, multiline?: boolean}) {
    const [focus, setFocus] = useState(false);
    const labelStyle = [
        (focus || value) ? styles.label : styles.largeLabel,
        focus ? styles.labelActive : undefined
    ];

    return (
        <View style={[styles.container]}>
            <View style={[styles.inputContainer, focus ? styles.inputContainerActive : undefined]}>
                <View style={styles.labelContainer}>
                    <Text style={labelStyle}>{label}</Text>
                </View>
                <TextInput
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    style={styles.textInput}
                    editable
                    multiline={multiline}
                    value={value}
                    onChangeText={onChangeText}
                    autoCapitalize="none"
                />
            </View>
        </View>
    )
}
