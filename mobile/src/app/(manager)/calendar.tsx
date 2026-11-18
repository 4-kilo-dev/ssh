import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { venueApi } from "@/api/endpoints";
import { useMyVenue, usePullRefresh, useRefetchOnFocus, useVenueCalendar } from "@/api/queries";
import type { CalendarClaim, CalendarDay } from "@/api/types";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Card, IconButton, TabHeader, layout } from "@/ui/Layout";
import { EmptyState, ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";
import { formatDate, formatMonthYear, weekdayHeaders } from "@/utils/format";
import { DAY_PARTS, addMonths, dateOf, hhmm, monthRange, parseDate, todayAddis } from "@/utils/time";

/** Manager calendar: month grid → day → halls with bookings/blocks; block or unblock time. */
export default function ManagerCalendar() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const today = todayAddis();
  const [month, setMonth] = useState(monthRange(today).first);
  const [selected, setSelected] = useState(today);
  const venueQ = useMyVenue();
  const venue = venueQ.data ?? null;
  const { first, last } = monthRange(month);
  const calendarQ = useVenueCalendar(venue?.id, first, last);
  const { refreshing, onRefresh } = usePullRefresh(calendarQ.refetch);
  useRefetchOnFocus(calendarQ.refetch, Boolean(venue));

  const unblock = useMutation({
    mutationFn: (claim: CalendarClaim) => venueApi.deleteBlock(venue!.id, claim.hallId, claim.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
    onError: (err) => Alert.alert(errorMessage(err)),
  });

  const header = <TabHeader title={t("calendarTitle")} />;

  if (venueQ.isPending) {
    return (
      <View style={layout.screen}>
        {header}
        <LoadingView />
      </View>
    );
  }
  if (!venue) {
    return (
      <View style={layout.screen}>
        {header}
        <EmptyState
          icon="business-outline"
          title={t("setupVenueTitle")}
          body={t("setupVenueBody")}
          actionLabel={t("setupVenue")}
          onAction={() => router.navigate("/my-venue")}
        />
      </View>
    );
  }

  const calendar = calendarQ.data;
  if (calendar && calendar.halls.length === 0) {
    return (
      <View style={layout.screen}>
        {header}
        <EmptyState
          icon="business-outline"
          title={t("noHalls")}
          body={t("noHallsBody")}
          actionLabel={t("addHall")}
          onAction={() => router.push({ pathname: "/hall-edit", params: { venueId: venue.id } })}
        />
      </View>
    );
  }

  const byDate = new Map<string, CalendarDay>((calendar?.days ?? []).map((d) => [d.date, d]));
  const { weekday: offset } = parseDate(first);
  const daysInMonth = parseDate(last).day;
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${first.slice(0, 8)}${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = byDate.get(selected);
  const selectedInMonth = selected >= first && selected <= last;
  const isPastDay = selected < today;

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    const { first: f, last: l } = monthRange(next);
    setSelected(today >= f && today <= l ? today : f);
  };

  const confirmUnblock = (claim: CalendarClaim) =>
    Alert.alert(t("unblockConfirm"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("unblock"), style: "destructive", onPress: () => unblock.mutate(claim) },
    ]);

  return (
    <View style={layout.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        {/* Month switcher */}
        <View style={styles.monthBar}>
          <IconButton icon="chevron-back" label="Previous month" onPress={() => changeMonth(-1)} />
          <Text variant="heading" center style={layout.flex}>
            {formatMonthYear(month, locale)}
          </Text>
          <IconButton icon="chevron-forward" label="Next month" onPress={() => changeMonth(1)} />
        </View>

        {/* Grid */}
        <Card style={styles.grid}>
          <View style={styles.week}>
            {weekdayHeaders(locale).map((w) => (
              <Text key={w} variant="caption" center style={styles.cell}>
                {w}
              </Text>
            ))}
          </View>
          {calendarQ.isPending ? (
            <ActivityIndicator color={colors.teal} style={styles.loader} />
          ) : calendarQ.isError ? (
            <ErrorView error={calendarQ.error} onRetry={() => calendarQ.refetch()} />
          ) : (
            Array.from({ length: cells.length / 7 }, (_, row) => (
              <View key={row} style={styles.week}>
                {cells.slice(row * 7, row * 7 + 7).map((date, i) => {
                  if (!date) return <View key={`e${i}`} style={styles.cell} />;
                  const day = byDate.get(date);
                  const claims = day?.claims ?? [];
                  const hasBooking = claims.some((c) => c.type === "booking");
                  const hasBlock = claims.some((c) => c.type === "block");
                  const isSelected = date === selected;
                  const past = date < today;
                  return (
                    <Pressable
                      key={date}
                      onPress={() => setSelected(date)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={formatDate(date, locale)}
                      style={[styles.cell, styles.dayCell, isSelected && styles.daySelected]}
                    >
                      <Text
                        variant="label"
                        color={isSelected ? colors.white : past ? colors.disabled : colors.ink}
                        style={date === today && !isSelected ? styles.todayText : undefined}
                      >
                        {parseDate(date).day}
                      </Text>
                      <View style={styles.dots}>
                        {hasBooking ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.white : colors.teal }]} /> : null}
                        {hasBlock ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.tealSoft : colors.muted }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.teal }]} />
            <Text variant="caption">{t("booked")}</Text>
            <View style={[styles.dot, { backgroundColor: colors.muted, marginLeft: space.md }]} />
            <Text variant="caption">{t("blocked")}</Text>
          </View>
        </Card>

        {/* Selected day */}
        {selectedInMonth && calendar ? (
          <View style={styles.dayPanel}>
            <View style={layout.row}>
              <Text variant="heading" style={layout.flex}>
                {formatDate(selected, locale)}
              </Text>
              {!isPastDay ? (
                <Button
                  title={t("blockTime")}
                  icon="lock-closed-outline"
                  compact
                  variant="secondary"
                  onPress={() => router.push({ pathname: "/block", params: { venueId: venue.id, date: selected } })}
                />
              ) : null}
            </View>

            {calendar.halls.map((hall) => {
              const claims = (selectedDay?.claims ?? []).filter((c) => c.hallId === hall.id);
              const free = selectedDay?.halls.find((h) => h.hallId === hall.id)?.free;
              const freeParts = DAY_PARTS.filter((p) => p.key !== "fullDay" && free?.[p.key]);
              return (
                <Card key={hall.id} style={styles.hallCard}>
                  <Text variant="label">{hall.name}</Text>
                  {claims.map((c) => (
                    <View key={c.id} style={styles.claim}>
                      <Icon
                        name={c.type === "booking" ? "calendar" : "lock-closed"}
                        size={18}
                        color={c.type === "booking" ? colors.teal : colors.muted}
                      />
                      <View style={layout.flex}>
                        <Text variant="label">
                          {c.type === "booking" ? t("booked") : t("blocked")} · {hhmm(c.startTime)}–{hhmm(c.endTime)}
                          {dateOf(c.endTime) !== dateOf(c.startTime) ? ` (${formatDate(dateOf(c.endTime), locale)})` : ""}
                        </Text>
                        {c.type === "block" && c.reason ? <Text variant="caption">{c.reason}</Text> : null}
                      </View>
                      {c.type === "booking" && c.bookingId ? (
                        <Button
                          title={t("details")}
                          compact
                          variant="ghost"
                          onPress={() => router.push(`/booking/${c.bookingId}`)}
                        />
                      ) : c.type === "block" ? (
                        <Button
                          title={t("unblock")}
                          compact
                          variant="ghost"
                          loading={unblock.isPending && unblock.variables?.id === c.id}
                          onPress={() => confirmUnblock(c)}
                        />
                      ) : null}
                    </View>
                  ))}
                  {freeParts.length > 0 ? (
                    <Text variant="caption" color={colors.success}>
                      {t("free")}: {freeParts.map((p) => t(`part_${p.key}`)).join(", ")}
                    </Text>
                  ) : claims.length === 0 ? (
                    <Text variant="caption">{isPastDay ? "—" : t("notFree")}</Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  monthBar: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.md },
  grid: { marginHorizontal: space.lg, padding: space.sm },
  week: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  dayCell: { minHeight: 46, justifyContent: "center", borderRadius: radius.sm },
  daySelected: { backgroundColor: colors.teal },
  todayText: { color: colors.teal, textDecorationLine: "underline" },
  dots: { flexDirection: "row", gap: 3, height: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  loader: { marginVertical: space.xl },
  legend: { flexDirection: "row", alignItems: "center", gap: space.xs, justifyContent: "center", marginTop: space.sm },
  dayPanel: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.md },
  hallCard: { gap: space.sm, padding: space.md },
  claim: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
