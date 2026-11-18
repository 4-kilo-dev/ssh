import { StyleSheet, View } from "react-native";
import type { BookingStatus } from "@/api/types";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Text } from "./Text";
import { Icon, type IconName } from "./Icon";

const look: Record<BookingStatus, { fg: string; bg: string; icon: IconName }> = {
  requested: { fg: colors.warning, bg: colors.warningBg, icon: "time-outline" },
  confirmed: { fg: colors.success, bg: colors.successBg, icon: "checkmark-circle" },
  cancelled: { fg: colors.danger, bg: colors.dangerBg, icon: "close-circle-outline" },
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const t = useT();
  const l = look[status];
  return (
    <View style={[styles.pill, { backgroundColor: l.bg }]}>
      <Icon name={l.icon} size={14} color={l.fg} />
      <Text variant="caption" color={l.fg} bold>
        {t(`status_${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "flex-start",
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
