import { ScrollView, SafeAreaView, View, Text } from 'react-native';
import Markdown from "@ronradtke/react-native-markdown-display";
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function Tab() {
  const theme = useTheme();
  const { t } = useTranslation();

  const copy = `
### **${t("clientTab.title")}**
${t("homeTab.body.clientText")}

### **${t("scanTab.title")}**
${t("homeTab.body.scanText")}

### **${t("homeTab.body.moreInfo")}**
${t("homeTab.body.moreInfoText")}
`

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
