import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./Text";

type Option<K extends string> = { key: K; label: string; count?: number };

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Option<K>[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.active]}
          >
            <Text variant="label" color={active ? colors.ink : colors.muted} numberOfLines={1}>
              {o.label}
              {o.count ? ` (${o.count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.line,
    borderRadius: radius.md,
    padding: 3,
    marginHorizontal: space.lg,
    marginBottom: space.md,
  },
  item: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  active: { backgroundColor: colors.surface },
});
