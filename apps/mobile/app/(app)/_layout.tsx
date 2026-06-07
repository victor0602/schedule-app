import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors, fontSize, shadow } from "../../src/theme";

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18, lineHeight: 22 }}>{icon}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
          ...shadow.md,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="schedules/index"
        options={{
          title: "课表",
          tabBarLabel: "课表",
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📅" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups/index"
        options={{
          title: "群组",
          tabBarLabel: "群组",
          tabBarIcon: ({ color }) => (
            <TabIcon icon="👥" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups/[id]"
        options={{ title: "群组详情", href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "设置",
          tabBarLabel: "设置",
          tabBarIcon: ({ color }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedules/[id]"
        options={{ title: "课表", href: null }}
      />
      <Tabs.Screen
        name="courses/new"
        options={{ title: "新建课程", href: null, presentation: "modal" }}
      />
      <Tabs.Screen
        name="courses/[id]"
        options={{ title: "课程详情", href: null, presentation: "modal" }}
      />
    </Tabs>
  );
}
