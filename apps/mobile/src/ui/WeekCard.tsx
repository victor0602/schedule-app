import { Pressable, ViewStyle } from "react-native";
import { Text } from "../theme";

interface WeekCardProps {
  title: string;
  teacher: string | null;
  location: string | null;
  color: string;
  start: string;
  end: string;
  height: number;
  onPress?: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function WeekCard({ title, teacher, location, color, start, end, height, onPress }: WeekCardProps) {
  const showAll = height >= 56;
  const showTitleAndTime = height >= 32;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: color,
          borderRadius: 12,
          overflow: "hidden",
          paddingHorizontal: 6,
          paddingTop: showTitleAndTime ? 4 : 0,
          justifyContent: showTitleAndTime ? "flex-start" : "center" as const,
          height,
          shadowColor: "#0F172A",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
          borderLeftWidth: 3,
          borderLeftColor: "rgba(255,255,255,0.3)",
          opacity: pressed ? 0.8 : 1,
        } as ViewStyle,
      ]}
    >
      {showTitleAndTime ? (
        <>
          <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700", lineHeight: 14 }} numberOfLines={1}>
            {formatTime(start)}–{formatTime(end)}
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", lineHeight: 15 }} numberOfLines={1}>
            {title}
          </Text>
          {showAll && location && (
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 10, lineHeight: 13 }} numberOfLines={1}>
              📍 {location}
            </Text>
          )}
          {showAll && teacher && (
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 10, lineHeight: 13 }} numberOfLines={1}>
              👤 {teacher}
            </Text>
          )}
        </>
      ) : (
        <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600", textAlign: "center" }} numberOfLines={1}>
          {formatTime(start)}
        </Text>
      )}
    </Pressable>
  );
}