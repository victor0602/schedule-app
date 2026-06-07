import { Text, View } from "react-native";
import Constants from "expo-constants";
import { Button } from "../ui/Button";
import { useAuth } from "../lib/auth-store";
import { Screen } from "../ui/primitives/Screen";

export default function SettingsScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const initial = (user?.displayName ?? user?.email ?? "U").charAt(0).toUpperCase();

  return (
    <Screen scroll>
      <Text style={{ fontSize: 26, fontWeight: "800", color: "#0F172A", marginBottom: 6 }}>设置</Text>
      <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>账号信息与应用设置</Text>

      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "800" }}>{initial}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>{user?.displayName ?? "未登录"}</Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{user?.email ?? ""}</Text>
      </View>

      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>关于</Text>
        {[{ k: "应用", v: "Schedule App" }, { k: "版本", v: "v0.1.0" }, { k: "API", v: Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000" }].map((r, i) => (
          <View key={r.k}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ color: "#0F172A", fontSize: 14 }}>{r.k}</Text>
              <Text style={{ color: "#64748B", fontSize: 13 }} numberOfLines={1}>{r.v}</Text>
            </View>
            {i < 2 && <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />}
          </View>
        ))}
      </View>

      <Button title="退出登录" variant="danger" onPress={logout} size="lg" testID="logout" />
    </Screen>
  );
}