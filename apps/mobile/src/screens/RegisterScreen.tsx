import { useState } from "react";
import { Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "../ui/Button";
import { Input } from "../components/Input";
import { useAuth } from "../lib/auth-store";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    if (!email.trim() || !password || !name.trim()) { setErr("请填写所有字段"); return; }
    if (password.length < 6) { setErr("密码至少 6 位"); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace("/(app)/schedules");
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setErr(Array.isArray(m) ? m.join("；") : typeof m === "string" ? m : (e?.message ?? "注册失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} keyboardAvoid>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: "#4F46E5", marginBottom: 8 }}>开始使用</Text>
        <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>创建账号，安排你的第一份课表</Text>
        <Card padded>
          <Input label="昵称" value={name} onChangeText={setName} placeholder="张三" />
          <Input label="邮箱" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="密码（至少 6 位）" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
          {err && <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "500", marginBottom: 8 }}>{err}</Text>}
          <Button title="注册" onPress={onSubmit} loading={loading} size="lg" testID="register-submit" />
          <View style={{ height: 24 }} />
          <Link href="/(auth)/login" style={{ color: "#4F46E5", textAlign: "center", fontSize: 14, fontWeight: "600" }}>
            已有账号？去登录
          </Link>
        </Card>
      </View>
    </Screen>
  );
}