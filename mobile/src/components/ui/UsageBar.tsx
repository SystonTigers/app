import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

export interface UsageBarProps {
  current: number;
  max?: number; // undefined = unlimited
  label?: string;
  unit?: string;
  style?: ViewStyle;
  showPercentage?: boolean;
}

export default function UsageBar({
  current,
  max,
  label = "Usage",
  unit = "",
  style,
  showPercentage = true,
}: UsageBarProps) {
  const pct = max && max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const barColor = pct >= 90 ? "#EF4444" : pct >= 75 ? "#F59E0B" : "#10B981";
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {max ? `${current}/${max}${unit ? " " + unit : ""}` : `${current}${unit ? " " + unit : ""}`}
          {showPercentage && max ? ` · ${pct}%` : ""}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  value: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  track: { height: 10, borderRadius: 6, backgroundColor: "#1F2937", overflow: "hidden" },
  fill: { height: 10, borderRadius: 6 },
});
