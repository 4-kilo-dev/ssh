import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space, TAP } from "@/theme";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.teal, fg: colors.white, border: colors.teal },
  secondary: { bg: colors.surface, fg: colors.teal, border: colors.line },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.line },
  ghost: { bg: "transparent", fg: colors.teal, border: "transparent" },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  compact,
  style,
  accessibilityLabel,
}: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border },
        variant === "primary" && inactive && styles.primaryDisabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : icon ? (
          <Icon name={icon} size={compact ? 18 : 20} color={inactive && variant !== "primary" ? colors.disabled : p.fg} />
        ) : null}
        <Text
          variant="label"
          numberOfLines={1}
          color={inactive && variant !== "primary" ? colors.disabled : p.fg}
          style={compact ? styles.compactText : styles.text}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: TAP - 8, paddingHorizontal: space.md, borderRadius: radius.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  text: { fontSize: 16 },
  compactText: { fontSize: 14 },
  pressed: { opacity: 0.8 },
  primaryDisabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
});
