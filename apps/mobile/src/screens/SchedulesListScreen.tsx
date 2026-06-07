import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { SOCKET_EVENTS, type Schedule } from "@schedule/shared";
import { colors, courseColors, fontSize, radius, shadow, spacing } from "../theme";
import { Screen } from "../ui/primitives/Screen";
import { Stack } from "../ui/primitives/Stack";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";
import { Box, Text } from "../theme";

export default function SchedulesListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => (await api.get<Schedule[]>("/schedules")).data,
  });

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    (async () => {
      socket = await getSocket();
      socket.on(SOCKET_EVENTS.SCHEDULE_UPDATED, () => {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
      });
    })();
    return () => { socket?.off(SOCKET_EVENTS.SCHEDULE_UPDATED); };
  }, [queryClient]);

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <Box mb="lg">
            <Text variant="hero">我的课表</Text>
            <Text variant="bodySmall" mt="xs">
              {data?.length ? `共 ${data.length} 份课表` : "创建第一份课表，开始安排你的一周"}
            </Text>
          </Box>
        }
        ListEmptyComponent={!isLoading ? <EmptyState title="还没有课表" subtitle="点下方按钮新建" /> : null}
        renderItem={({ item, index }) => (
          <ScheduleCard
            schedule={item}
            color={courseColors[index % courseColors.length]}
            onPress={() => router.push(`/(app)/schedules/${item.id}`)}
          />
        )}
      />
      <CreateButton onCreated={() => refetch()} />
    </Screen>
  );
}

function ScheduleCard({ schedule, color, onPress }: { schedule: Schedule; color: string; onPress: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(schedule.name);
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);

  const handleRename = async () => {
    if (!renameVal.trim()) return;
    setRenaming(true);
    try {
      await api.patch(`/schedules/${schedule.id}`, { name: renameVal.trim() });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setRenameOpen(false); setMenuOpen(false);
    } catch (e: any) { Alert.alert("重命名失败", e?.response?.data?.message ?? "未知错误");
    } finally { setRenaming(false); }
  };

  const handleDelete = () => {
    Alert.alert("删除课表", `确定删除「${schedule.name}」吗？此操作不可恢复。`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        try { await api.delete(`/schedules/${schedule.id}`); queryClient.invalidateQueries({ queryKey: ["schedules"] }); }
        catch (e: any) { Alert.alert("删除失败", e?.response?.data?.message ?? "未知错误"); }
      }},
    ]);
  };

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center",
          backgroundColor: colors.bgCard, padding: spacing.lg,
          borderRadius: radius.lg, marginBottom: spacing.md,
          borderLeftWidth: 4, borderLeftColor: color,
          ...shadow.md,
        }, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <Box flex={1}>
          <Text variant="h3">{schedule.name}</Text>
          <Text variant="caption" mt="xs">
            {schedule.type === "group" ? "群组课表" : "个人课表"} · v{schedule.version}
          </Text>
        </Box>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.bgMuted : undefined })}
        >
          <Text style={{ color: colors.textMuted, fontSize: 20, lineHeight: 22 }}>⋯</Text>
        </Pressable>
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setMenuOpen(false)}>
          <Box bg="cardBackground" borderRadius="xl" overflow="hidden" mx="lg" style={shadow.lg}>
            <Text variant="h3" textAlign="center" p="lg" pb="sm">{schedule.name}</Text>
            <Pressable style={styles.actionSheetRow} onPress={() => { setRenameVal(schedule.name); setRenameOpen(true); }}>
              <Text variant="body">✏️  重命名</Text>
            </Pressable>
            <Box height={1} backgroundColor="border" mx="lg" />
            <Pressable style={styles.actionSheetRow} onPress={handleDelete}>
              <Text variant="body" color="danger">🗑  删除课表</Text>
            </Pressable>
          </Box>
        </Pressable>
      </Modal>

      <Modal visible={renameOpen} transparent animationType="slide" onRequestClose={() => setRenameOpen(false)}>
        <Box flex={1} justifyContent="center" px="lg" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
          <Box bg="cardBackground" borderRadius="xl" p="xl" style={shadow.lg}>
            <Text variant="h2" mb="lg">重命名课表</Text>
            <TextInput value={renameVal} onChangeText={setRenameVal} style={styles.modalInput} placeholder="输入新名称" placeholderTextColor={colors.textMuted} autoFocus />
            <Stack direction="row" gap="md">
              <Button title="取消" variant="secondary" onPress={() => setRenameOpen(false)} style={{ flex: 1 }} />
              <Button title="保存" onPress={handleRename} loading={renaming} style={{ flex: 1 }} />
            </Stack>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

function CreateButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"private" | "group">("private");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post("/schedules", { name: name.trim(), type });
      onCreated(); setOpen(false); setName("");
    } catch (e: any) { alert(e?.response?.data?.message ?? "创建失败");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Box position="absolute" style={{ left: spacing.lg, right: spacing.lg, bottom: spacing.lg, ...shadow.lg }}>
        <Button title="+ 新建课表" onPress={() => setOpen(true)} size="lg" testID="new-schedule" />
      </Box>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Box flex={1} justifyContent="center" px="lg" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
          <Box bg="cardBackground" borderRadius="xl" p="xl" style={shadow.lg}>
            <Text variant="h2" mb="lg">新建课表</Text>
            <Text variant="bodySmall" fontWeight="600" mb="sm">名称</Text>
            <TextInput placeholder="比如：2026 春季" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={styles.modalInput} testID="schedule-name-input" />
            <Text variant="bodySmall" fontWeight="600" mb="sm">类型</Text>
            <Stack direction="row" gap="sm">
              {(["private", "group"] as const).map((t) => (
                <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text variant="bodySmall" style={type === t ? { color: "#FFFFFF", fontWeight: "700" } : { color: colors.text }}>{t === "private" ? "个人" : "群组"}</Text>
                </Pressable>
              ))}
            </Stack>
            <Box height={24} />
            <Stack direction="row" gap="md">
              <Button title="取消" variant="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }} testID="cancel-schedule" />
              <Button title="创建" onPress={submit} loading={loading} style={{ flex: 1 }} testID="create-schedule" />
            </Stack>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: spacing.lg },
  modalInput: { backgroundColor: colors.bgMuted, color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, fontSize: fontSize.md, marginBottom: spacing.lg },
  chip: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: colors.bgMuted, borderWidth: 1.5, borderColor: "transparent" },
  actionSheetRow: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
});