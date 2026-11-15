import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { venueApi } from "@/api/endpoints";
import { useVenueCalendar } from "@/api/queries";
import type { DayPartKey } from "@/api/types";
import { SheetHeader } from "@/features/SheetHeader";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { Notice, layout } from "@/ui/Layout";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";
import { formatDate } from "@/utils/format";
import { DAY_PARTS, addisISO } from "@/utils/time";

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Manager: block a hall for part of a day (phone bookings, closed days). */
export default function BlockSheet() {
  const { venueId, date } = useLocalSearchParams<{ venueId: string; date: string }>();
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const calendarQ = useVenueCalendar(venueId, date, date);
  const [hallId, setHallId] = useState<string | null>(null);
  const [part, setPart] = useState<DayPartKey>("fullDay");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const block = useMutation({
    mutationFn: (input: { hallId: string; startTime: string; endTime: string; reason?: string }) =>
      venueApi.createBlock(venueId, input.hallId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      router.back();
    },
    onError: (err) => setError(err instanceof ApiError && err.isConflict ? t("slotTaken") : errorMessage(err)),
  });

  if (calendarQ.isPending) return <LoadingView />;
  if (calendarQ.isError || !calendarQ.data) return <ErrorView error={calendarQ.error} onRetry={() => calendarQ.refetch()} />;

  const calendar = calendarQ.data;
  const day = calendar.days[0];
  const activeHallId = hallId ?? calendar.halls[0]?.id ?? null;
  const free = day?.halls.find((h) => h.hallId === activeHallId)?.free;
  const isFree = (p: DayPartKey) => Boolean(free?.[p]);
  const activePart = isFree(part) ? part : DAY_PARTS.find((p) => isFree(p.key))?.key ?? null;

  const submit = () => {
    setError(null);
    if (!activeHallId || !activePart) {
      setError(t("noHallFree"));
      return;
    }
    const p = DAY_PARTS.find((d) => d.key === activePart)!;
    block.mutate({
      hallId: activeHallId,
      startTime: addisISO(date, p.startHour),
      endTime: addisISO(date, p.endHour),
      reason: reason.trim() || undefined,
    });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("blockTime")} subtitle={formatDate(date, locale)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Notice tone="info">{t("blockHint")}</Notice>

        <Text variant="label" style={styles.label}>
          {t("hall")}
        </Text>
        <View style={layout.wrap}>
          {calendar.halls.map((h) => (
            <Chip
              key={h.id}
              label={h.name}
              selected={activeHallId === h.id}
              onPress={() => {
                setHallId(h.id);
                setError(null);
              }}
            />
          ))}
        </View>

        <Text variant="label" style={styles.label}>
          {t("time")}
        </Text>
        <View style={styles.options}>
          {DAY_PARTS.map((p) => {
            const ok = isFree(p.key);
            const selected = ok && activePart === p.key;
            return (
              <Pressable
                key={p.key}
                disabled={!ok}
                onPress={() => setPart(p.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !ok }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Icon name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={ok ? colors.teal : colors.disabled} />
                <Text variant="label" style={layout.flex} color={ok ? colors.ink : colors.disabled}>
                  {t(`part_${p.key}`)}
                </Text>
                <Text variant="caption">{ok ? `${pad(p.startHour)}–${pad(p.endHour)}` : t("notFree")}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.reason}>
          <Field
            label={t("blockReason")}
            value={reason}
            onChangeText={setReason}
            placeholder={t("blockReasonPlaceholder")}
            maxLength={200}
          />
        </View>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button
          title={block.isPending ? t("saving") : t("blockTime")}
          icon="lock-closed"
          loading={block.isPending}
          disabled={!activePart}
          onPress={submit}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  label: { marginTop: space.xl, marginBottom: space.sm },
  options: { gap: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  reason: { marginTop: space.xl },
  button: { marginTop: space.md },
});
