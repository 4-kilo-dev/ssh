import { useMemo } from "react";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useBookings, usePullRefresh, useRefetchOnFocus } from "@/api/queries";
import { useAuth } from "@/auth/AuthProvider";
import { BookingCard } from "@/features/BookingCard";
import { splitBookings } from "@/features/bookings";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { TabHeader, layout } from "@/ui/Layout";
import { EmptyState, ErrorView, LoadingView } from "@/ui/States";
import { Text } from "@/ui/Text";

export default function BookingsTab() {
  const t = useT();
  const router = useRouter();
  const { account } = useAuth();
  const bookings = useBookings();
  const { refreshing, onRefresh } = usePullRefresh(bookings.refetch);
  useRefetchOnFocus(bookings.refetch, Boolean(account));

  const sections = useMemo(() => {
    const { upcoming, past } = splitBookings(bookings.data ?? []);
    return [
      { title: t("upcoming"), data: upcoming },
      { title: t("past"), data: past },
    ].filter((s) => s.data.length > 0);
  }, [bookings.data, t]);

  let body;
  if (!account) {
    body = (
      <EmptyState
        icon="calendar-outline"
        title={t("guestBookings")}
        actionLabel={t("signIn")}
        onAction={() => router.push("/sign-in")}
      />
    );
  } else if (bookings.isPending) {
    body = <LoadingView />;
  } else if (bookings.isError && !bookings.data) {
    body = <ErrorView error={bookings.error} onRetry={() => bookings.refetch()} />;
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(b) => b.id}
        renderSectionHeader={({ section }) => (
          <Text variant="label" color={colors.muted} style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <BookingCard booking={item} onPress={() => router.push(`/booking/${item.id}`)} />
          </View>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={t("noBookings")}
            body={t("noBookingsBody")}
            actionLabel={t("findVenue")}
            onAction={() => router.navigate("/")}
          />
        }
      />
    );
  }

  return (
    <View style={layout.screen}>
      <TabHeader title={t("bookingsTitle")} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  emptyContent: { flexGrow: 1 },
  sectionTitle: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm, textTransform: "uppercase" },
  item: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
