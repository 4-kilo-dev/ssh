import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@/theme";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

/** Large title at the top of a tab screen, with an optional button on the right. */
export function TabHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabHeader, { paddingTop: insets.top + space.md }]}>
      <Text variant="title" style={styles.flex} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Round icon button (header actions). */
export function IconButton({
  icon,
  onPress,
  label,
  color = colors.ink,
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  badge?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={color} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

/** Initials in a circle. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant="label" color={colors.teal} style={{ fontSize: size * 0.38 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

/** White rounded box. Pressable when onPress is given. */
export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/** Titled block inside a scrolling screen. */
export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="heading" style={styles.flex}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Icon + label + value line used in detail screens. */
export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color={colors.teal} />
      <View style={styles.flex}>
        <Text variant="caption">{label}</Text>
        <Text>{value}</Text>
      </View>
    </View>
  );
}

/** Action bar fixed at the bottom of the screen, above the home indicator. */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      {children}
    </View>
  );
}

/** Coloured notice box. */
export function Notice({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  icon?: IconName;
  children: ReactNode;
}) {
  const map = {
    info: { bg: colors.infoBg, fg: colors.info, icon: "information-circle" as IconName },
    success: { bg: colors.successBg, fg: colors.success, icon: "checkmark-circle" as IconName },
    warning: { bg: colors.warningBg, fg: colors.warning, icon: "time" as IconName },
    danger: { bg: colors.dangerBg, fg: colors.danger, icon: "alert-circle" as IconName },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: map.bg }]}>
      <Icon name={icon ?? map.icon} size={20} color={map.fg} />
      <View style={styles.flex}>
        {typeof children === "string" ? <Text color={map.fg}>{children}</Text> : children}
      </View>
    </View>
  );
}

export const layout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  padded: { paddingHorizontal: space.lg },
  listContent: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  scrollContent: { paddingBottom: 140 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chipsRow: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  flex: { flex: 1 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.paper,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  pressed: { opacity: 0.8 },
  avatar: { backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  section: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.md },
  sectionHeader: { flexDirection: "row", alignItems: "center" },
  infoRow: { flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: space.sm },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  notice: {
    flexDirection: "row",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: "flex-start",
  },
});
