import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { bookingApi } from "@/api/endpoints";
import { keys, useVenue, useVenueCalendar } from "@/api/queries";
import type { DayPartKey } from "@/api/types";
import { bestHall, dayHasFreeTime, findDay, firstFreeDate, freeHallIds, stripDays } from "@/features/availability";
import { SheetHeader } from "@/features/SheetHeader";
import { useAfterSignIn } from "@/features/useAfterSignIn";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { DateStrip } from "@/ui/DateStrip";
import { Field } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { BottomBar, Notice, layout } from "@/ui/Layout";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";
import { DAY_PARTS, addisISO } from "@/utils/time";

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Booking sheet. Everything has a sensible default (first free date, full day,
 * best-fitting hall), so most people only tap "Send request".
 */
export default function BookSheet() {
  const params = useLocalSearchParams<{ venueId: string; date?: string; guests?: string }>();
  const venueId = params.venueId;
  const t = useT();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const venueQ = useVenue(venueId);
  const calendarQ = useVenueCalendar(venueId);

  const [date, setDate] = useState<string | null>(params.date || null);
  const [part, setPart] = useState<DayPartKey>("fullDay");
  const [guestsText, setGuestsText] = useState(params.guests || "");
  const [hallId, setHallId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // When availability loads (or changes), make sure the chosen date has free time.
  useEffect(() => {
    if (!calendarQ.data) return;
    const current = findDay(calendarQ.data, date);
    if (!current || !dayHasFreeTime(current)) setDate(firstFreeDate(calendarQ.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarQ.data]);

  const halls = venueQ.data?.halls ?? [];
  const day = findDay(calendarQ.data, date);
  const isPartFree = (p: DayPartKey) => freeHallIds(day, p).length > 0;
  const activePart: DayPartKey = isPartFree(part) ? part : DAY_PARTS.find((p) => isPartFree(p.key))?.key ?? part;
  const freeIds = freeHallIds(day, activePart);
  const guests = Math.max(0, parseInt(guestsText.replace(/\D/g, ""), 10) || 0);
  const chosenHall =
    (hallId && freeIds.includes(hallId) ? halls.find((h) => h.id === hallId) : null) ?? bestHall(halls, freeIds, guests);
  const freeHalls = halls.filter((h) => freeIds.includes(h.id));
  const biggestFree = freeHalls.reduce((m, h) => Math.max(m, h.capacity), 0);
  const tooSmall = Boolean(chosenHall && guests > chosenHall.capacity);
  const partDef = DAY_PARTS.find((p) => p.key === activePart)!;

  const mutation = useMutation({
    mutationFn: bookingApi.create,
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: keys.bookings });
      queryClient.invalidateQueries({ queryKey: keys.calendarAll(venueId) });
      router.dismiss();
      router.push({ pathname: "/booking/[id]", params: { id: booking.id, created: "1" } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.isConflict) {
        setError(t("slotTaken"));
        calendarQ.refetch();
      } else {
        setError(errorMessage(err));
      }
    },
  });

  const send = () => {
    setError(null);
    if (!date || !chosenHall) {
      setError(t("noHallFree"));
      return;
    }
    mutation.mutate({
      venueId,
      hallIds: [chosenHall.id],
      startTime: addisISO(date, partDef.startHour),
      endTime: addisISO(date, partDef.endHour),
      guestCount: guests,
      notes: notes.trim() || undefined,
    });
  };

  const sendWhenSignedIn = useAfterSignIn(send);

  if (venueQ.isPending || calendarQ.isPending) return <LoadingView />;
  if (venueQ.isError || !venueQ.data) return <ErrorView error={venueQ.error} onRetry={() => venueQ.refetch()} />;
  if (calendarQ.isError || !calendarQ.data)
    return <ErrorView error={calendarQ.error} onRetry={() => calendarQ.refetch()} />;

  const changeGuests = (delta: number) => setGuestsText(String(Math.max(0, guests + delta)));

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("bookTitle", { venue: venueQ.data.venue.name })} />
      <ScrollView contentContainerStyle={layout.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Date */}
        <Text variant="heading" style={styles.label}>
          {t("date")}
        </Text>
        <DateStrip
          days={stripDays(calendarQ.data)}
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setHallId(null);
            setError(null);
          }}
        />

        {/* Time */}
        <Text variant="heading" style={styles.label}>
          {t("time")}
        </Text>
        <View style={styles.block}>
          {DAY_PARTS.map((p) => {
            const free = isPartFree(p.key);
            const selected = free && p.key === activePart;
            return (
              <Pressable
                key={p.key}
                disabled={!free}
                onPress={() => {
                  setPart(p.key);
                  setHallId(null);
                  setError(null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !free }}
                style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
              >
                <Icon
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={free ? colors.teal : colors.disabled}
                />
                <Text variant="label" style={layout.flex} color={free ? colors.ink : colors.disabled}>
                  {t(`part_${p.key}`)}
                </Text>
                <Text variant="caption">{free ? `${pad(p.startHour)}–${pad(p.endHour)}` : t("notFree")}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Guests */}
        <Text variant="heading" style={styles.label}>
          {t("guests")}
        </Text>
        <View style={[styles.block, styles.stepper]}>
          <Pressable onPress={() => changeGuests(-10)} style={styles.stepButton} accessibilityLabel="-10" hitSlop={6}>
            <Icon name="remove" size={22} color={colors.teal} />
          </Pressable>
          <TextInput
            value={guestsText}
            onChangeText={(v) => setGuestsText(v.replace(/\D/g, "").slice(0, 5))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
            style={styles.stepInput}
            accessibilityLabel={t("guests")}
            maxFontSizeMultiplier={1.4}
          />
          <Pressable onPress={() => changeGuests(10)} style={styles.stepButton} accessibilityLabel="+10" hitSlop={6}>
            <Icon name="add" size={22} color={colors.teal} />
          </Pressable>
        </View>

        {/* Hall */}
        <Text variant="heading" style={styles.label}>
          {t("hall")}
        </Text>
        <View style={styles.block}>
          {freeHalls.length === 0 ? (
            <Notice tone="warning">{t("noHallFree")}</Notice>
          ) : (
            <View style={layout.wrap}>
              {freeHalls.map((h) => (
                <Chip
                  key={h.id}
                  label={`${h.name} · ${t("fits", { n: h.capacity })}`}
                  selected={chosenHall?.id === h.id}
                  onPress={() => setHallId(h.id)}
                />
              ))}
            </View>
          )}
          {tooSmall ? <Notice tone="warning">{t("tooManyGuests", { n: guests, max: biggestFree })}</Notice> : null}
        </View>

        {/* Notes + info */}
        <View style={[styles.block, styles.notes]}>
          <Field
            label={`${t("notes")} (${t("optional")})`}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("notesPlaceholder")}
            multiline
            maxLength={500}
          />
          <Notice tone="info" icon="cash-outline">
            {t("noPaymentNow")}
          </Notice>
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </View>
      </ScrollView>

      <BottomBar>
        <Button
          title={mutation.isPending ? t("sending") : t("sendRequest")}
          icon="paper-plane"
          loading={mutation.isPending}
          disabled={!chosenHall}
          onPress={sendWhenSignedIn}
          style={layout.flex}
        />
      </BottomBar>
      {calendarQ.isFetching ? <ActivityIndicator style={styles.fetching} color={colors.teal} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  block: { paddingHorizontal: space.lg, gap: space.sm },
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
  pressed: { opacity: 0.85 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInput: {
    flex: 1,
    height: 52,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  notes: { marginTop: space.xl },
  fetching: { position: "absolute", top: space.lg, alignSelf: "center" },
});
