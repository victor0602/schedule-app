import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";
import { Stack } from "../ui/primitives/Stack";
import { Button } from "../ui/Button";
import { colors, courseColors, radius, spacing } from "../theme";
import type { GroupMember } from "@schedule/shared";
import { Box, Text } from "../theme";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  const groupQ = useQuery({
    queryKey: ["group", id],
    queryFn: async () => { const groups = await api.get<any[]>("/groups"); return groups.data.find((g) => g.id === id) ?? null; },
    enabled: !!id,
  });

  const membersQ = useQuery({
    queryKey: ["group-members", id],
    queryFn: async () => (await api.get<GroupMember[]>(`/groups/${id}/members`)).data,
    enabled: !!id,
  });

  const handleLeave = () => {
    Alert.alert("退出群组", "确定要退出该群组吗？", [
      { text: "取消", style: "cancel" },
      { text: "退出", style: "destructive", onPress: async () => {
        setLeaving(true);
        try { await api.delete(`/groups/${id}/members/me`); queryClient.invalidateQueries({ queryKey: ["groups"] }); router.back(); }
        catch (e: any) { Alert.alert("退出失败", e?.response?.data?.message ?? "未知错误"); }
        finally { setLeaving(false); }
      }},
    ]);
  };

  const copyInviteCode = () => {
    if (groupQ.data?.inviteCode) {
      if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(groupQ.data.inviteCode); Alert.alert("已复制", "邀请码已复制到剪贴板"); }
      else { Alert.alert("邀请码", groupQ.data.inviteCode); }
    }
  };

  if (groupQ.isLoading) {
    return <Screen scroll={false}><Box flex={1} alignItems="center" justifyContent="center"><ActivityIndicator color={colors.primary} /></Box></Screen>;
  }
  if (!groupQ.data) {
    return <Screen scroll={false}><Box flex={1} alignItems="center" justifyContent="center"><Text variant="body" color="textMuted">群组不存在</Text></Box></Screen>;
  }

  const group = groupQ.data;
  return (
    <Screen scroll={false}>
      <Stack direction="row" alignItems="center" mb="md">
        <Box flex={1}><Text variant="h1">{group.name}</Text></Box>
      </Stack>

      <Card elevated="md" bordered mb="md">
        <Pressable onPress={copyInviteCode}>
          <Stack direction="row" alignItems="center" gap="sm">
            <Text variant="caption" fontWeight="600">邀请码</Text>
            <Text variant="h3" color="primary">{group.inviteCode}</Text>
            <Box style={{ marginLeft: "auto" }}><Text variant="caption" color="textMuted">点击复制</Text></Box>
          </Stack>
        </Pressable>
      </Card>

      <Text variant="bodySmall" mb="md">{membersQ.data?.length ?? 0} 位成员</Text>

      <FlatList
        data={membersQ.data ?? []}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={membersQ.isLoading} onRefresh={() => membersQ.refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ flexGrow: 1 }}
        renderItem={({ item, index }) => <MemberCard member={item} color={courseColors[index % courseColors.length]} />}
        ListEmptyComponent={<Text variant="body" color="textMuted" textAlign="center" mt="xxl">暂无成员</Text>}
      />

      <Box pt="lg" bg="cardBackground" borderTopWidth={1} borderTopColor="border">
        <Button title="退出群组" variant="danger" onPress={handleLeave} loading={leaving} size="lg" />
      </Box>
    </Screen>
  );
}

function MemberCard({ member, color }: { member: GroupMember; color: string }) {
  const initial = (member.user?.displayName ?? "?").charAt(0).toUpperCase();
  const roleLabel = member.role === "owner" ? "所有者" : member.role === "editor" ? "编辑者" : "查看者";
  const roleColor = member.role === "owner" ? colors.primary : member.role === "editor" ? "#F59E0B" : colors.textMuted;

  return (
    <Card elevated="sm" mb="md">
      <Stack direction="row" alignItems="center" gap="md">
        <Box width={40} height={40} style={{ borderRadius: 20, backgroundColor: color }} alignItems="center" justifyContent="center">
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{initial}</Text>
        </Box>
        <Box flex={1}>
          <Text variant="h3">{member.user?.displayName ?? "未知用户"}</Text>
          <Text variant="caption">{member.user?.email ?? ""}</Text>
        </Box>
        <Box px="md" style={{ paddingVertical: 4, borderRadius: radius.pill, backgroundColor: roleColor + "20" }}>
          <Text variant="caption" style={{ color: roleColor, fontWeight: "700" }}>{roleLabel}</Text>
        </Box>
      </Stack>
    </Card>
  );
}