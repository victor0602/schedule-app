import { Platform } from "react-native";

export const shadow = {
  sm: {
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1, shadowColor: "#0F172A" },
      default: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  md: {
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3, shadowColor: "#0F172A" },
      default: { shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  lg: {
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 6, shadowColor: "#0F172A" },
      default: { shadowColor: "#0F172A", shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
    }),
  },
} as const;