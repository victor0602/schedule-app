import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { colors, courseColors, fontSize, radius, spacing } from "../theme";
import type { Course, CourseOccurrence } from "@schedule/shared";
import { expandOccurrences, toLocalDate } from "../lib/expand-occurrences";
import { WeekCard } from "../ui/WeekCard";

const HOUR_HEIGHT = 56;
const START_HOUR = 6;
const END_HOUR = 23;
const TIME_COL_WIDTH = 50;
const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

interface WeekViewProps {
  courses: Course[];
  onSelectOccurrence?: (occ: CourseOccurrence) => void;
}

export function WeekView({ courses, onSelectOccurrence }: WeekViewProps) {
  const { width } = useWindowDimensions();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const occurrences = useMemo(() => {
    const from = new Date(weekStart);
    from.setHours(0, 0, 0, 0);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);
    return expandOccurrences(courses, from, to);
  }, [courses, weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, CourseOccurrence[]>();
    for (const occ of occurrences) {
      const arr = map.get(occ.date) ?? [];
      arr.push(occ);
      map.set(occ.date, arr);
    }
    return map;
  }, [occurrences]);

  const isNarrow = width < 500;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header navigation */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.bgElevated,
      }}>
        <Pressable
          onPress={() => setWeekStart((d) => addDays(d, -7))}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: pressed ? colors.primaryLight : colors.bgMuted,
            alignItems: "center", justifyContent: "center",
          })}
          testID="prev-week"
        >
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700", lineHeight: 26 }}>‹</Text>
        </Pressable>

        <View style={{
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          borderRadius: radius.pill, backgroundColor: colors.primaryLight,
        }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>
            {format(weekStart, "yyyy")} · {format(weekStart, "MM/dd")} ~ {format(addDays(weekStart, 6), "MM/dd")}
          </Text>
        </View>

        <Pressable
          onPress={() => setWeekStart((d) => addDays(d, 7))}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: pressed ? colors.primaryLight : colors.bgMuted,
            alignItems: "center", justifyContent: "center",
          })}
          testID="next-week"
        >
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700", lineHeight: 26 }}>›</Text>
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={{
        flexDirection: "row",
        backgroundColor: colors.bgElevated,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <View style={{ width: TIME_COL_WIDTH }} />
        {days.map((d, i) => {
          const today = isSameDay(d, now);
          return (
            <View key={i} style={{
              flex: 1, paddingVertical: spacing.sm, alignItems: "center",
              borderRadius: radius.md, margin: 2,
              backgroundColor: today ? colors.primary : "transparent",
            }}>
              <Text style={{ color: today ? "#FFFFFF" : colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                {DAY_LABELS[i === 6 ? 0 : i + 1]}
              </Text>
              <Text style={{ color: today ? "#FFFFFF" : colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 }}>
                {format(d, "MM/dd")}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grid body */}
      <ScrollView style={{ flex: 1 }} horizontal={isNarrow}>
        <View style={{ flexDirection: "row", backgroundColor: colors.bg, minWidth: isNarrow ? 700 : "100%" }}>
          {/* Time column */}
          <View style={{ width: TIME_COL_WIDTH }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
              <View key={i} style={{
                height: HOUR_HEIGHT,
                justifyContent: "flex-start", alignItems: "center",
                paddingTop: 2,
                borderTopWidth: 1, borderTopColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "500" }}>
                  {String(START_HOUR + i).padStart(2, "0")}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {days.map((d, i) => {
            const dateKey = toLocalDate(d);
            const list = byDay.get(dateKey) ?? [];
            const today = isSameDay(d, now);
            return (
              <View key={i} style={{
                flex: 1, position: "relative",
                borderLeftWidth: 1, borderLeftColor: colors.border,
                backgroundColor: today ? "#FEF9F0" : colors.bgElevated,
              }}>
                {/* Grid lines */}
                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, h) => (
                  <View key={h} style={{
                    position: "absolute", left: 0, right: 0, top: h * HOUR_HEIGHT,
                    height: 1, backgroundColor: colors.border, opacity: 0.4,
                  }} />
                ))}

                {/* Event cards */}
                {list.map((occ, idx) => {
                  const start = new Date(occ.start);
                  const end = new Date(occ.end);
                  const top = (start.getHours() + start.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;
                  const height = Math.max(28, ((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT);
                  const color = occ.color || courseColors[idx % courseColors.length];
                  return (
                    <View key={`${occ.courseId}-${occ.start}`} style={{
                      position: "absolute", left: 2, right: 2, top,
                    }}>
                      <WeekCard
                        title={occ.title}
                        teacher={occ.teacher}
                        location={occ.location}
                        color={color}
                        start={occ.start}
                        end={occ.end}
                        height={height}
                        onPress={() => onSelectOccurrence?.(occ)}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}