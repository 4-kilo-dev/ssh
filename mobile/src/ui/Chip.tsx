import { Pressable, StyleSheet } from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: IconName;
  onPress?: () => void;
};

export function Chip({ label, selected, disabled, icon, onPress }: Props) {
  const fg = disabled ? colors.disabled : selected ? colors.white : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text variant="label" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  pressed: { opacity: 0.8 },
});
