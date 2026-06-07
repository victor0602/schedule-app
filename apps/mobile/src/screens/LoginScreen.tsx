import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "../ui/Button";
import { Input } from "../components/Input";
import { useAuth } from "../lib/auth-store";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(app)/schedules");
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setErr(Array.isArray(m) ? m.join("；") : typeof m === "string" ? m : (e?.message ?? "登录失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} keyboardAvoid>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 42, fontWeight: "800", color: "#4F46E5", marginBottom: 8 }}>课表</Text>
        <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>和你一起，安排每一周。</Text>
        <Card padded>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 4 }}>欢迎回来</Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>登录后继续你的课表</Text>
          <Input label="邮箱" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="密码" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
          {err && <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "500", marginBottom: 12 }}>{err}</Text>}
          <Button title="登录" onPress={onSubmit} loading={loading} size="lg" testID="login-submit" />
          <View style={{ height: 24 }} />
          <Link href="/(auth)/register" style={{ color: "#4F46E5", textAlign: "center", fontSize: 14, fontWeight: "600" }}>
            还没有账号？立即注册
          </Link>
        </Card>
      </View>
    </Screen>
  );
}