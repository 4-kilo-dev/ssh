import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { monthShort, weekdayShort } from "@/utils/format";
import { parseDate, todayAddis } from "@/utils/time";
import { Text } from "./Text";

export interface StripDay {
  date: string;
  free: boolean;
}

type Props = {
  days: StripDay[];
  selected?: string | null;
  onSelect: (date: string) => void;
  /** When true, days without free time cannot be tapped. */
  disableBusy?: boolean;
};

/** Horizontal row of dates; a green dot marks days with free time. */
export function DateStrip({ days, selected, onSelect, disableBusy = true }: Props) {
  const { locale, t } = useLocale();
  const today = todayAddis();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((d, i) => {
        const isSelected = d.date === selected;
        const disabled = disableBusy && !d.free;
        const { day } = parseDate(d.date);
        const showMonth = i === 0 || day === 1;
        return (
          <Pressable
            key={d.date}
            onPress={() => onSelect(d.date)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={`${weekdayShort(d.date, locale)} ${day} ${monthShort(d.date, locale)}${d.free ? "" : `, ${t("notFree")}`}`}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.selected,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="caption" color={isSelected ? colors.white : colors.muted}>
              {d.date === today ? t("today") : weekdayShort(d.date, locale)}
            </Text>
            <Text variant="heading" color={isSelected ? colors.white : disabled ? colors.disabled : colors.ink}>
              {day}
            </Text>
            <Text variant="caption" color={isSelected ? colors.white : colors.muted}>
              {showMonth ? monthShort(d.date, locale) : " "}
            </Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: d.free ? (isSelected ? colors.white : colors.success) : "transparent" },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
  cell: {
    width: 60,
    paddingVertical: space.sm,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 2,
  },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  disabled: { backgroundColor: colors.paper },
  pressed: { opacity: 0.8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
});
