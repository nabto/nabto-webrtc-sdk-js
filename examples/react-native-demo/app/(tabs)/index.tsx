import { ScrollView, SafeAreaView, Platform, View, Text } from 'react-native';
import Markdown from "@ronradtke/react-native-markdown-display";
import { useTheme } from '@react-navigation/native';

const copy = `
### **Connect**
Use the connect function and fill in a product ID and device ID to connect to a WebRTC-enabled camera that is using Nabto Signaling.

### **Scan**
Use the scan function to scan a QR code that has been shared to you to automatically fill in connection details for a camera you wish to connect to.

### **More Information**
You may find more information about this app and contact us on [docs.nabto.com](https://docs.nabto.com/)
`

export default function Tab() {
  const theme = useTheme();

  return (
    <SafeAreaView>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: "orange" }}
      >
        <View style={{ width: "100%", height: 200, borderBottomWidth: 2, borderColor: "lightsalmon", padding: 24, flex: 1, justifyContent: "flex-end" }}>
          <Text style={{
            textAlign: "center",
            fontSize: 32,
            lineHeight: 32,
            fontWeight: "light",
            color: "#f0f0f0"
          }}>
            Welcome to{"\n"}
            Nabto WebRTC
          </Text>
        </View>
        <View style={{ paddingTop: 32, paddingLeft: 12, paddingRight: 12, paddingBottom: 32, backgroundColor: theme.colors.background }}>
          <Markdown>
            {copy}
          </Markdown>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
