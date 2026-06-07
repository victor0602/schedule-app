import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, TextInput, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { WeekView } from "../components/WeekView";
import { Button } from "../ui/Button";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";
import { SOCKET_EVENTS, type Course, type Schedule } from "@schedule/shared";
import { colors, fontSize, radius, shadow, spacing } from "../theme";
import { Box, Text } from "../theme";

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const scheduleQ = useQuery({
    queryKey: ["schedule", id],
    queryFn: async () => (await api.get<Schedule>(`/schedules/${id}`)).data,
    enabled: !!id,
  });

  const coursesQ = useQuery({
    queryKey: ["courses", id],
    queryFn: async () => (await api.get<Course[]>(`/schedules/${id}/courses`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    let cancelled = false;
    (async () => {
      socket = await getSocket();
      if (cancelled) return;
      const invalidate = () => queryClient.invalidateQueries({ queryKey: ["courses", id] });
      socket.on(SOCKET_EVENTS.COURSE_CREATED, invalidate);
      socket.on(SOCKET_EVENTS.COURSE_UPDATED, invalidate);
      socket.on(SOCKET_EVENTS.COURSE_DELETED, invalidate);
    })();
    return () => {
      cancelled = true;
      if (socket) { socket.off(SOCKET_EVENTS.COURSE_CREATED); socket.off(SOCKET_EVENTS.COURSE_UPDATED); socket.off(SOCKET_EVENTS.COURSE_DELETED); }
    };
  }, [id, queryClient]);

  const headerTitle = scheduleQ.data?.name ?? "课表";
  const courseCount = coursesQ.data?.length ?? 0;

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(headerTitle);
  const [renaming, setRenaming] = useState(false);

  const handleRename = async () => {
    if (!renameVal.trim()) return;
    setRenaming(true);
    try {
      await api.patch(`/schedules/${id}`, { name: renameVal.trim() });
      queryClient.invalidateQueries({ queryKey: ["schedule", id] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setRenameOpen(false);
    } catch (e: any) { Alert.alert("重命名失败", e?.response?.data?.message ?? "未知错误");
    } finally { setRenaming(false); }
  };

  const handleDelete = () => {
    Alert.alert("删除课表", `确定删除「${headerTitle}」吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        try { await api.delete(`/schedules/${id}`); queryClient.invalidateQueries({ queryKey: ["schedules"] }); router.back(); }
        catch (e: any) { Alert.alert("删除失败", e?.response?.data?.message ?? "未知错误"); }
      }},
    ]);
  };

  return (
    <Screen scroll={false}>
      <Box mb="md">
        <Box flexDirection="row" alignItems="center">
          <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.sm, paddingRight: spacing.md }}>
            <Text variant="body" color="primary" fontWeight="600">‹ 返回</Text>
          </Pressable>
          <Box flex={1} />
          <Box flexDirection="row" gap="sm" alignItems="center">
            <Pressable onPress={() => { setRenameVal(headerTitle); setRenameOpen(true); }} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgMuted, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 16 }}>🗑</Text>
            </Pressable>
            <Button title="+ 课程" onPress={() => router.push({ pathname: "/(app)/courses/new", params: { scheduleId: id } })} testID="new-course" />
          </Box>
        </Box>
        <Text variant="bodySmall" mt="xs">{courseCount > 0 ? `${courseCount} 门课程` : "添加第一门课程"}</Text>
      </Box>

      <Box flex={1}>
        <WeekView courses={coursesQ.data ?? []} onSelectOccurrence={(occ) => router.push({ pathname: "/(app)/courses/[id]", params: { id: occ.courseId, scheduleId: id } })} />
      </Box>

      <Modal visible={renameOpen} transparent animationType="slide" onRequestClose={() => setRenameOpen(false)}>
        <Box flex={1} justifyContent="center" px="xl" style={{ backgroundColor: "rgba(15,23,42,0.45)" }}>
          <Card elevated="lg">
            <Text variant="h2" mb="lg">重命名课表</Text>
            <TextInput value={renameVal} onChangeText={setRenameVal} style={styles.modalInput} placeholder="输入新名称" placeholderTextColor={colors.textMuted} autoFocus />
            <Box flexDirection="row" gap="md">
              <Button title="取消" variant="secondary" onPress={() => setRenameOpen(false)} style={{ flex: 1 }} />
              <Button title="保存" onPress={handleRename} loading={renaming} style={{ flex: 1 }} />
            </Box>
          </Card>
        </Box>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalInput: { backgroundColor: colors.bgMuted, color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, fontSize: fontSize.md, marginBottom: spacing.lg },
});