import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

function HomeHeader() {
  return (
    <View style={{ height: 200, backgroundColor: "orange", elevation: 4, borderBottomWidth: 2, borderColor: "lightsalmon"}}>
      <Text>Welcome to</Text>
    </View>
  )
}

export default function TabLayout() {
  // @TODO: When we want to make a device app, we need a way to set this from outside.
  const isDevice = false;
  const clientOptions =  isDevice ? { href: null } : {}
  const deviceOptions = !isDevice ? { href: null } : {}

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'orange', tabBarHideOnKeyboard: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: "",
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome6 size={28} name="house-chimney" color={color} />,
          header: () => <HomeHeader/>,
        }}
      />
      <Tabs.Screen
        name="client"
        options={{
          ...clientOptions,
          title: 'Connect',
          headerTitle: 'Connect',
          tabBarIcon: ({ color }) => <FontAwesome6 size={28} name="plug"  color={color} />,
        }}
      />

      <Tabs.Screen
        name="device"

        options={{
          ...deviceOptions,
          title: 'Device',
          headerTitle: 'Device Mode',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="video-camera" color={color} />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          headerTitle: "Scan",
          tabBarIcon: ({ color }) => <FontAwesome6 size={28} name="qrcode" color={color} />
        }}
      />

    </Tabs>
  );
}