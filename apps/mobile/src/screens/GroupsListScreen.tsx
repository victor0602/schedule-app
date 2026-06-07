import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Modal, TextInput, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";
import { Stack } from "../ui/primitives/Stack";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { colors, courseColors, radius, shadow, spacing, fontSize } from "../theme";
import type { Group } from "@schedule/shared";
import { Box, Text } from "../theme";

interface GroupWithMeta extends Group { role: string; memberCount: number; }

export default function GroupsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get<GroupWithMeta[]>("/groups")).data,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <Box mb="lg">
            <Text variant="hero">群组</Text>
            <Text variant="bodySmall" mt="xs">和同学一起共享课表，实时同步</Text>
          </Box>
        }
        ListEmptyComponent={!isLoading ? <EmptyState icon="👥" title="还没有群组" subtitle="创建一个群组，或通过邀请码加入" /> : null}
        renderItem={({ item, index }) => <GroupCard group={item} color={courseColors[index % courseColors.length]} />}
      />
      <Box flexDirection="row" p="lg" bg="cardBackground" borderTopWidth={1} borderTopColor="border" style={shadow.sm}>
        <Box flex={1} mr="md"><Button title="加入群组" variant="secondary" onPress={() => setJoinOpen(true)} testID="join-group" /></Box>
        <Box flex={1}><Button title="创建群组" onPress={() => setCreateOpen(true)} testID="open-create-group" /></Box>
      </Box>
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refetch(); }} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={() => { setJoinOpen(false); refetch(); }} />
    </Screen>
  );
}

function GroupCard({ group, color }: { group: GroupWithMeta; color: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(app)/groups/${group.id}`)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.bgCard, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: color, ...shadow.md, transform: pressed ? [{ scale: 0.98 }] : [] })}
    >
      <Box flex={1}>
        <Text variant="h3">{group.name}</Text>
        <Text variant="caption" mt="xs">{group.memberCount} 人 · 角色 {group.role}</Text>
        <Stack direction="row" alignItems="center" gap="sm" mt="sm">
          <Text variant="caption" fontWeight="600">邀请码</Text>
          <Text variant="body" color="primary" fontWeight="700">{group.inviteCode}</Text>
        </Stack>
      </Box>
      <Text variant="h2" color="textMuted">›</Text>
    </Pressable>
  );
}

function CreateGroupModal({ open, onClose, onCreated }: any) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try { await api.post("/groups", { name: name.trim() }); onCreated(); setName("");
    } catch (e: any) { Alert.alert("创建失败", e?.response?.data?.message ?? "未知错误");
    } finally { setLoading(false); }
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Box flex={1} justifyContent="center" px="lg" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
        <Card elevated="lg">
          <Text variant="h2" mb="lg">创建群组</Text>
          <Text variant="bodySmall" fontWeight="600" mb="sm">群组名称</Text>
          <TextInput placeholder="比如：高三一班" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={styles.modalInput} testID="group-name-input" />
          <Box height={24} />
          <Stack direction="row" gap="md">
            <Button title="取消" variant="secondary" onPress={onClose} style={{ flex: 1 }} testID="cancel-group" />
            <Button title="创建" onPress={submit} loading={loading} style={{ flex: 1 }} testID="confirm-create-group" />
          </Stack>
        </Card>
      </Box>
    </Modal>
  );
}

function JoinGroupModal({ open, onClose, onJoined }: any) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try { await api.post("/groups/join", { inviteCode: code.trim() }); onJoined(); setCode("");
    } catch (e: any) { Alert.alert("加入失败", e?.response?.data?.message ?? "未知错误");
    } finally { setLoading(false); }
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Box flex={1} justifyContent="center" px="lg" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
        <Card elevated="lg">
          <Text variant="h2" mb="lg">加入群组</Text>
          <Text variant="bodySmall" fontWeight="600" mb="sm">邀请码</Text>
          <TextInput placeholder="8-12 位的邀请码" placeholderTextColor={colors.textMuted} value={code} onChangeText={setCode} autoCapitalize="none" style={styles.modalInput} testID="invite-code-input" />
          <Box height={24} />
          <Stack direction="row" gap="md">
            <Button title="取消" variant="secondary" onPress={onClose} style={{ flex: 1 }} testID="cancel-join" />
            <Button title="加入" onPress={submit} loading={loading} style={{ flex: 1 }} testID="confirm-join-group" />
          </Stack>
        </Card>
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalInput: { backgroundColor: colors.bgMuted, color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, fontSize: fontSize.md },
});