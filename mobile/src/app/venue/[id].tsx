import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useChats, useVenue, useVenueCalendar } from "@/api/queries";
import { firstFreeDate, stripDays } from "@/features/availability";
import { SETTING_ICON } from "@/features/hallSetting";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { DateStrip } from "@/ui/DateStrip";
import { Icon } from "@/ui/Icon";
import { BottomBar, Card, Notice, Section, layout } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { ErrorView, LoadingView } from "@/ui/States";
import { Text } from "@/ui/Text";
import { venueImages } from "@/utils/images";
import { callPhone } from "@/utils/links";
import { formatPhone } from "@/utils/phone";

/**
 * Venue page. Tapping a green date opens the booking sheet with that date —
 * so booking is: venue card → date → Send request (3 taps).
 */
export default function VenueScreen() {
  const { id, guests } = useLocalSearchParams<{ id: string; guests?: string }>();
  const { t } = useLocale();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const venueQ = useVenue(id);
  const calendarQ = useVenueCalendar(id);
  const chats = useChats();
  const [photoIndex, setPhotoIndex] = useState(0);

  if (venueQ.isPending) return <LoadingView />;
  if (venueQ.isError || !venueQ.data) return <ErrorView error={venueQ.error} onRetry={() => venueQ.refetch()} />;

  const { venue, halls } = venueQ.data;
  const images = venueImages(venue);
  const days = stripDays(calendarQ.data);
  const firstFree = firstFreeDate(calendarQ.data);
  const maxCapacity = halls.reduce((m, h) => Math.max(m, h.capacity), 0);

  const openBook = (date?: string | null) =>
    router.push({
      pathname: "/book",
      params: { venueId: venue.id, date: date ?? firstFree ?? "", guests: guests ?? "" },
    });

  const openChat = (prefill?: string) => {
    const existing = chats.data?.find((c) => c.venueId === venue.id);
    if (existing) {
      router.push({ pathname: "/chat/[id]", params: { id: existing.id, text: prefill ?? "" } });
    } else {
      router.push({ pathname: "/chat/new", params: { venueId: venue.id, text: prefill ?? "" } });
    }
  };

  return (
    <View style={layout.screen}>
      <Stack.Screen options={{ title: venue.name }} />
      <ScrollView contentContainerStyle={layout.scrollContent}>
        {/* Photos */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {images.map((uri) => (
            <RemoteImage key={uri} uri={uri} style={{ width, height: width * 0.62 }} />
          ))}
        </ScrollView>
        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((uri, i) => (
              <View key={uri} style={[styles.dot, i === photoIndex && styles.dotActive]} />
            ))}
          </View>
        ) : null}

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text variant="title">{venue.name}</Text>
          <View style={layout.row}>
            <Icon name="location-outline" size={16} color={colors.muted} />
            <Text color={colors.muted}>
              {venue.area} · {venue.type}
            </Text>
          </View>
          {maxCapacity > 0 ? (
            <View style={layout.row}>
              <Icon name="people-outline" size={16} color={colors.teal} />
              <Text variant="label">
                {t("upTo", { n: maxCapacity })} · {halls.length === 1 ? t("hallOne") : t("hallsCount", { n: halls.length })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Date strip */}
        <View style={styles.dateBlock}>
          <View style={layout.padded}>
            <Text variant="heading">{t("pickDate")}</Text>
            <Text variant="caption" style={styles.hint}>
              {t("pickDateHint")}
            </Text>
          </View>
          {calendarQ.isPending ? (
            <ActivityIndicator color={colors.teal} style={styles.loader} />
          ) : calendarQ.isError ? (
            <View style={layout.padded}>
              <Button title={t("retry")} variant="secondary" compact onPress={() => calendarQ.refetch()} />
            </View>
          ) : firstFree ? (
            <DateStrip days={days} onSelect={(date) => openBook(date)} />
          ) : (
            <View style={layout.padded}>
              <Notice tone="warning">{t("noFreeDates")}</Notice>
            </View>
          )}
        </View>

        {/* Halls */}
        {halls.length > 0 ? (
          <Section title={t("halls")}>
            {halls.map((h) => (
              <Card key={h.id} style={styles.hallRow}>
                <Icon name={SETTING_ICON[h.setting]} size={22} color={colors.teal} />
                <View style={layout.flex}>
                  <Text variant="label">{h.name}</Text>
                  <Text variant="caption">
                    {t(`setting_${h.setting}`)}
                    {h.notes ? ` · ${h.notes}` : ""}
                  </Text>
                </View>
                <Text variant="label">{t("guestsCount", { n: h.capacity })}</Text>
              </Card>
            ))}
          </Section>
        ) : null}

        {venue.description ? (
          <Section title={t("about")}>
            <Text>{venue.description}</Text>
          </Section>
        ) : null}

        {venue.amenities && venue.amenities.length > 0 ? (
          <Section title={t("amenities")}>
            <View style={layout.wrap}>
              {venue.amenities.map((a) => (
                <View key={a} style={styles.amenity}>
                  <Icon name="checkmark" size={14} color={colors.teal} />
                  <Text variant="label">{a}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {venue.policies ? (
          <Section title={t("policies")}>
            <Text>{venue.policies}</Text>
          </Section>
        ) : null}

        <Section title={t("contact")}>
          {venue.contactPhone ? (
            <Button
              title={`${t("call")} ${formatPhone(venue.contactPhone)}`}
              icon="call-outline"
              variant="secondary"
              onPress={() => callPhone(venue.contactPhone!, t("cannotOpen"))}
            />
          ) : null}
          <Button
            title={t("askPrice")}
            icon="pricetag-outline"
            variant="secondary"
            onPress={() => openChat(t("askPriceText", { venue: venue.name }))}
          />
        </Section>
      </ScrollView>

      <BottomBar>
        <Button title={t("message")} icon="chatbubble-outline" variant="secondary" onPress={() => openChat()} style={styles.messageButton} />
        <Button title={t("book")} icon="calendar" onPress={() => openBook()} disabled={halls.length === 0} style={styles.bookButton} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: space.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.teal },
  titleBlock: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.xs },
  dateBlock: { marginTop: space.xl, gap: space.md },
  hint: { marginTop: 2 },
  loader: { marginVertical: space.lg },
  hallRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
  },
  messageButton: { flex: 1 },
  bookButton: { flex: 1.4 },
});
