import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/api/endpoints";
import { keys, useBooking, useChats } from "@/api/queries";
import type { Booking } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Card, InfoRow, Notice, layout } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { StatusPill } from "@/ui/StatusPill";
import { Text } from "@/ui/Text";
import { formatWhen } from "@/utils/format";
import { venueCover } from "@/utils/images";
import { callPhone } from "@/utils/links";
import { formatPhone } from "@/utils/phone";

/** Booking details. Shared by customers and venue managers (who get Confirm / Decline). */
export default function BookingScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { t, locale } = useLocale();
  const router = useRouter();
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const bookingQ = useBooking(id);
  const chats = useChats();

  const onChanged = (updated: Booking) => {
    queryClient.setQueryData(keys.booking(id), (old: Booking | undefined) => (old ? { ...old, ...updated } : old));
    queryClient.invalidateQueries({ queryKey: keys.bookings });
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
  };

  const cancel = useMutation({
    mutationFn: (reason: string) => bookingApi.cancel(id, reason),
    onSuccess: onChanged,
    onError: (err) => Alert.alert(errorMessage(err)),
  });
  const confirm = useMutation({
    mutationFn: () => bookingApi.confirm(id),
    onSuccess: onChanged,
    onError: (err) => Alert.alert(errorMessage(err)),
  });

  if (bookingQ.isPending) return <LoadingView />;
  if (bookingQ.isError || !bookingQ.data) return <ErrorView error={bookingQ.error} onRetry={() => bookingQ.refetch()} />;

  const b = bookingQ.data;
  const isManager = account?.role === "venue_manager";
  const ended = new Date(b.endTime).getTime() < Date.now();
  const canCancel = b.status !== "cancelled" && !ended;
  const when = formatWhen(b.startTime, b.endTime, locale, (k) => t(`part_${k}`));

  const explain =
    b.status === "requested"
      ? isManager
        ? t("explain_requested_manager")
        : t("explain_requested_customer")
      : b.status === "confirmed"
        ? t("explain_confirmed")
        : t("explain_cancelled");

  const askCancel = () =>
    Alert.alert(isManager ? t("declineConfirmTitle") : t("cancelConfirmTitle"), t("cancelConfirmBody"), [
      { text: t("keepBooking"), style: "cancel" },
      {
        text: isManager ? t("decline") : t("cancelBooking"),
        style: "destructive",
        onPress: () => cancel.mutate(isManager ? t("declinedByVenue") : t("cancelledByCustomer")),
      },
    ]);

  const messageVenue = () => {
    const existing = chats.data?.find((c) => c.venueId === b.venueId);
    if (existing) router.push(`/chat/${existing.id}`);
    else router.push({ pathname: "/chat/new", params: { venueId: b.venueId } });
  };

  return (
    <ScrollView style={layout.screen} contentContainerStyle={styles.content}>
      {created ? <Notice tone="success">{t("requestSent")}</Notice> : null}

      <Card style={styles.gap}>
        {b.venue && !isManager ? <RemoteImage uri={venueCover(b.venue)} style={styles.image} /> : null}
        <StatusPill status={b.status} />
        <Text variant="title">{isManager ? b.customer?.name ?? t("customer") : b.venue?.name ?? ""}</Text>
        <Text color={colors.muted}>{explain}</Text>
        {b.status === "cancelled" && b.cancellationReason ? (
          <Text variant="caption">
            {t("reason")}: {b.cancellationReason}
          </Text>
        ) : null}
      </Card>

      <Card>
        <InfoRow icon="calendar-outline" label={t("when")} value={when} />
        <InfoRow
          icon="business-outline"
          label={t("where")}
          value={[b.venue?.name, b.hallNames.join(", ")].filter(Boolean).join(" · ")}
        />
        {b.guestCount > 0 ? (
          <InfoRow icon="people-outline" label={t("guests")} value={t("guestsCount", { n: b.guestCount })} />
        ) : null}
        {b.notes ? <InfoRow icon="document-text-outline" label={t("notes")} value={b.notes} /> : null}
        {isManager && b.customer ? (
          <InfoRow
            icon="person-outline"
            label={t("customer")}
            value={`${b.customer.name}${b.customer.phone ? ` · ${formatPhone(b.customer.phone)}` : ""}`}
          />
        ) : null}
      </Card>

      <View style={styles.actions}>
        {isManager ? (
          <>
            {b.status === "requested" ? (
              <Button title={t("confirm")} icon="checkmark" loading={confirm.isPending} onPress={() => confirm.mutate()} />
            ) : null}
            {b.customer?.phone ? (
              <Button
                title={`${t("call")} ${b.customer.name}`}
                icon="call-outline"
                variant="secondary"
                onPress={() => callPhone(b.customer!.phone!, t("cannotOpen"))}
              />
            ) : null}
            {canCancel ? (
              <Button title={t("decline")} icon="close" variant="danger" loading={cancel.isPending} onPress={askCancel} />
            ) : null}
          </>
        ) : (
          <>
            <Button title={t("messageVenue")} icon="chatbubble-outline" variant="secondary" onPress={messageVenue} />
            {canCancel ? (
              <Button title={t("cancelBooking")} icon="close" variant="danger" loading={cancel.isPending} onPress={askCancel} />
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  gap: { gap: space.sm },
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.md, marginBottom: space.sm },
  actions: { gap: space.md, marginTop: space.sm },
});
