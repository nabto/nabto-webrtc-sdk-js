import { Colors, TextField } from "react-native-ui-lib";

export default function SettingsInput({label, value, onChangeText, multiline}: {label: string, value: string, onChangeText: (text: string) => void, multiline?: boolean}) {
    return (
    <TextField
        preset={TextField.presets.UNDERLINE}
        placeholder={label}
        floatingPlaceholder
        editable
        multiline={multiline}
        value={value}
        selectionColor="orange"
        floatingPlaceholderColor={value.length == 0 ? Colors.grey40 : Colors.orange40}
        onChangeText={onChangeText}
        autoCapitalize="none"
    />
   )
}
