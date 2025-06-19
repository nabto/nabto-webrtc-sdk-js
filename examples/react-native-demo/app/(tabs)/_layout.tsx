import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

function HomeHeader() {
  return (
    <View style={{ height: 200, backgroundColor: "orange", elevation: 4, borderBottomWidth: 2, borderColor: "lightsalmon"}}>
      <Text>Welcome to</Text>
    </View>
  )
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'orange', tabBarHideOnKeyboard: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t("homeTab.title"),
          headerTitle: "",
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} />,
          header: () => <HomeHeader/>,
        }}
      />
      <Tabs.Screen
        name="client"
        options={{
          title: t("clientTab.title"),
          headerTitle: t("clientTab.headerTitle"),
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="cast-connected"  color={color} />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: t("scanTab.title"),
          headerTitle: t("scanTab.headerTitle"),
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="qr-code-scanner" color={color} />
        }}
      />

    </Tabs>
  );
}