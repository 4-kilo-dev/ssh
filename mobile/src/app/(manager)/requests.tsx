import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/api/endpoints";
import { keys, useBookings, useMyVenue, usePullRefresh, useRefetchOnFocus } from "@/api/queries";
import type { Booking } from "@/api/types";
import { BookingCard } from "@/features/BookingCard";
import { splitBookings } from "@/features/bookings";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "@/ui/Button";
import { IconButton, TabHeader, layout } from "@/ui/Layout";
import { Segmented } from "@/ui/Segmented";
import { EmptyState, ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { callPhone } from "@/utils/links";

type Segment = "new" | "upcoming" | "history";

/** Manager home: new requests with Confirm / Decline right on the card (1 tap). */
export default function Requests() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venueQ = useMyVenue();
  const bookings = useBookings();
  const [segment, setSegment] = useState<Segment>("new");
  const { refreshing, onRefresh } = usePullRefresh(bookings.refetch);
  useRefetchOnFocus(bookings.refetch);

  const groups = useMemo(() => {
    const { upcoming, past } = splitBookings(bookings.data ?? []);
    return {
      new: upcoming.filter((b) => b.status === "requested"),
      upcoming: upcoming.filter((b) => b.status === "confirmed"),
      history: past,
    };
  }, [bookings.data]);

  const action = useMutation({
    mutationFn: ({ booking, kind }: { booking: Booking; kind: "confirm" | "decline" }) =>
      kind === "confirm" ? bookingApi.confirm(booking.id) : bookingApi.cancel(booking.id, t("declinedByVenue")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.bookings });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (err) => Alert.alert(errorMessage(err)),
  });

  const decline = (booking: Booking) =>
    Alert.alert(t("declineConfirmTitle"), t("cancelConfirmBody"), [
      { text: t("keepBooking"), style: "cancel" },
      { text: t("decline"), style: "destructive", onPress: () => action.mutate({ booking, kind: "decline" }) },
    ]);

  const header = <TabHeader title={t("requestsTitle")} />;

  if (venueQ.isPending || bookings.isPending) {
    return (
      <View style={layout.screen}>
        {header}
        <LoadingView />
      </View>
    );
  }
  if (!venueQ.data) {
    return (
      <View style={layout.screen}>
        {header}
        {venueQ.isError ? (
          <ErrorView error={venueQ.error} onRetry={() => venueQ.refetch()} />
        ) : (
          <EmptyState
            icon="business-outline"
            title={t("setupVenueTitle")}
            body={t("setupVenueBody")}
            actionLabel={t("setupVenue")}
            onAction={() => router.navigate("/my-venue")}
          />
        )}
      </View>
    );
  }
  if (bookings.isError && !bookings.data) {
    return (
      <View style={layout.screen}>
        {header}
        <ErrorView error={bookings.error} onRetry={() => bookings.refetch()} />
      </View>
    );
  }

  const list = groups[segment];
  const busyId = action.isPending ? action.variables?.booking.id : undefined;
  const empty = {
    new: { title: t("noRequests"), body: t("noRequestsBody") },
    upcoming: { title: t("noUpcoming"), body: undefined },
    history: { title: t("noHistory"), body: undefined },
  }[segment];

  return (
    <View style={layout.screen}>
      {header}
      <Segmented<Segment>
        options={[
          { key: "new", label: t("seg_new"), count: groups.new.length },
          { key: "upcoming", label: t("seg_upcoming") },
          { key: "history", label: t("seg_history") },
        ]}
        value={segment}
        onChange={setSegment}
      />
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={list.length === 0 ? styles.emptyContent : layout.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        ListEmptyComponent={<EmptyState icon="file-tray-outline" title={empty.title} body={empty.body} />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            showCustomer
            onPress={() => router.push(`/booking/${item.id}`)}
            actions={
              item.status === "requested" ? (
                <>
                  {item.customer?.phone ? (
                    <IconButton
                      icon="call-outline"
                      label={`${t("call")} ${item.customer.name}`}
                      color={colors.teal}
                      onPress={() => callPhone(item.customer!.phone!, t("cannotOpen"))}
                    />
                  ) : null}
                  <Button
                    title={t("decline")}
                    variant="danger"
                    compact
                    disabled={busyId === item.id}
                    onPress={() => decline(item)}
                    style={layout.flex}
                  />
                  <Button
                    title={t("confirm")}
                    icon="checkmark"
                    compact
                    loading={busyId === item.id && action.variables?.kind === "confirm"}
                    disabled={busyId === item.id}
                    onPress={() => action.mutate({ booking: item, kind: "confirm" })}
                    style={styles.confirm}
                  />
                </>
              ) : undefined
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContent: { flexGrow: 1 },
  confirm: { flex: 1.4 },
});
