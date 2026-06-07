import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, TextInput, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfWeek, addDays } from "date-fns";
import { api } from "../lib/api";
import { Screen } from "../ui/primitives/Screen";
import { Card } from "../ui/primitives/Card";
import { Button } from "../ui/Button";
import { Input } from "../components/Input";
import { courseColors, colors, fontSize, radius, spacing } from "../theme";
import type { Course } from "@schedule/shared";
import { Box, Text } from "../theme";

const WEEKDAYS = [
  { label: "一", value: 0, code: "MO" }, { label: "二", value: 1, code: "TU" },
  { label: "三", value: 2, code: "WE" }, { label: "四", value: 3, code: "TH" },
  { label: "五", value: 4, code: "FR" }, { label: "六", value: 5, code: "SA" },
  { label: "日", value: 6, code: "SU" },
];

const DEFAULT_COLORS = courseColors;

export default function CourseFormScreen() {
  const { id, scheduleId } = useLocalSearchParams<{ id?: string; scheduleId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [color, setColor] = useState<string>(DEFAULT_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const coursesQ = useQuery({
    queryKey: ["courses", scheduleId],
    queryFn: async () => (await api.get<Course[]>(`/schedules/${scheduleId}/courses`)).data,
    enabled: isEdit && !!scheduleId,
  });

  const course = coursesQ.data?.find((c) => c.id === id);
  if (isEdit && course && !title) {
    setTitle(course.title);
    setTeacher(course.teacher ?? "");
    setLocation(course.location ?? "");
    setStartTime(course.startTime ?? "09:00");
    setEndTime(course.endTime ?? "10:00");
    setColor(course.color ?? DEFAULT_COLORS[0]);
  }

  const toggleDay = (v: number) => setSelectedDays((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const submit = async () => {
    if (!title.trim()) return Alert.alert("提示", "请输入课程名称");
    if (!isEdit && selectedDays.length === 0) return Alert.alert("提示", "请至少选择一天");
    if (!scheduleId) return;
    setLoading(true);
    try {
      if (isEdit && course) {
        await api.patch(`/courses/${id}`, { title: title.trim(), teacher: teacher.trim() || null, location: location.trim() || null });
        queryClient.invalidateQueries({ queryKey: ["courses", scheduleId] });
        router.replace(`/(app)/schedules/${scheduleId}`);
      } else {
        const byday = selectedDays.sort((a, b) => a - b).map((d) => WEEKDAYS.find((w) => w.value === d)!.code).join(",");
        const rrule = `FREQ=WEEKLY;BYDAY=${byday}`;
        const [sh, sm] = startTime.split(":").map(Number);
        const sortedDays = [...selectedDays].sort((a, b) => a - b);
        const todayWeekday = (new Date().getDay() + 6) % 7;
        const nextOffset = sortedDays.find((d) => d >= todayWeekday) ?? sortedDays[0];
        const base = startOfWeek(new Date(), { weekStartsOn: 1 });
        const dtstartDate = addDays(base, nextOffset ?? 0);
        dtstartDate.setHours(sh ?? 0, sm ?? 0, 0, 0);

        await api.post(`/schedules/${scheduleId}/courses`, { title: title.trim(), teacher: teacher.trim() || undefined, location: location.trim() || undefined, startTime, endTime, rrule, dtstart: dtstartDate.toISOString(), color });
        queryClient.invalidateQueries({ queryKey: ["courses", scheduleId] });
        router.replace(`/(app)/schedules/${scheduleId}`);
      }
    } catch (e: any) { Alert.alert(isEdit ? "保存失败" : "创建失败", e?.response?.data?.message ?? "未知错误");
    } finally { setLoading(false); }
  };

  const remove = () => {
    Alert.alert("删除课程", "确定要删除该课程吗？", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => {
        await api.delete(`/courses/${id}`);
        queryClient.invalidateQueries({ queryKey: ["courses", scheduleId] });
        router.replace(`/(app)/schedules/${scheduleId}`);
      }},
    ]);
  };

  return (
    <Screen keyboardAvoid scroll>
      <Box flexDirection="row" alignItems="center" mb="lg">
        <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.sm, paddingRight: spacing.md }}>
          <Text variant="body" color="primary" fontWeight="600">‹ 返回</Text>
        </Pressable>
        <Box flex={1} />
        <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.sm, paddingLeft: spacing.md }}>
          <Text variant="body" color="textMuted">取消</Text>
        </Pressable>
      </Box>

      <Text variant="h1" mb="xs">{isEdit ? "编辑课程" : "新建课程"}</Text>
      <Text variant="bodySmall" mb="lg">{isEdit ? "查看和编辑课程信息" : "添加一门新的课程到课表"}</Text>

      <Card elevated="md" padded>
        <Input label="课程名称" value={title} onChangeText={setTitle} placeholder="高等数学" />
        <Box flexDirection="row" gap="md" mt="md">
          <Box flex={1}><Input label="教师" value={teacher} onChangeText={setTeacher} placeholder="李老师" /></Box>
          <Box flex={1}><Input label="地点" value={location} onChangeText={setLocation} placeholder="A 楼 301" /></Box>
        </Box>

        {!isEdit && (
          <>
            <Box flexDirection="row" gap="md" mt="md">
              <Box flex={1}><Input label="开始 (HH:mm)" value={startTime} onChangeText={setStartTime} placeholder="09:00" /></Box>
              <Box flex={1}><Input label="结束 (HH:mm)" value={endTime} onChangeText={setEndTime} placeholder="10:00" /></Box>
            </Box>

            <Text variant="bodySmall" fontWeight="700" mt="md" mb="sm">重复</Text>
            <Box flexDirection="row" flexWrap="wrap">
              {WEEKDAYS.map((d) => {
                const active = selectedDays.includes(d.value);
                return (
                  <Pressable key={d.value} onPress={() => toggleDay(d.value)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: active ? colors.primary : colors.bgMuted, alignItems: "center", justifyContent: "center", marginRight: spacing.sm, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: active ? colors.primary : "transparent" }}>
                    <Text variant="bodySmall" style={active ? { color: "#FFFFFF", fontWeight: "800" } : { color: colors.textMuted, fontWeight: "600" }}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </Box>

            <Text variant="bodySmall" fontWeight="700" mt="md" mb="sm">颜色</Text>
            <Box flexDirection="row" flexWrap="wrap">
              {DEFAULT_COLORS.map((c) => (
                <Pressable key={c} onPress={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, marginRight: spacing.md, marginBottom: spacing.md, borderWidth: color === c ? 3 : 0, borderColor: colors.text }} />
              ))}
            </Box>
          </>
        )}
      </Card>

      <Box height={24} />
      <Button title={isEdit ? "保存" : "创建课程"} onPress={submit} loading={loading} size="lg" testID="create-course" />
      {isEdit && <><Box height={12} /><Button title="删除课程" variant="danger" onPress={remove} size="lg" /></>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalInput: { backgroundColor: colors.bgMuted, color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, fontSize: fontSize.md, marginBottom: spacing.lg },
});