import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { Booking } from "@/api/types";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Card } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { StatusPill } from "@/ui/StatusPill";
import { Text } from "@/ui/Text";
import { formatWhen } from "@/utils/format";
import { venueCover } from "@/utils/images";

/**
 * One booking. Customers see the venue; managers (showCustomer) see who booked.
 * `actions` renders inline buttons (e.g. Confirm / Decline) under the card.
 */
export function BookingCard({
  booking,
  onPress,
  showCustomer,
  actions,
}: {
  booking: Booking;
  onPress: () => void;
  showCustomer?: boolean;
  actions?: ReactNode;
}) {
  const { t, locale } = useLocale();
  const title = showCustomer ? booking.customer?.name ?? t("customer") : booking.venue?.name ?? "";
  const when = formatWhen(booking.startTime, booking.endTime, locale, (k) => t(`part_${k}`));
  const extra = [booking.hallNames.join(", "), booking.guestCount > 0 ? t("guestsCount", { n: booking.guestCount }) : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${when}`}>
      <View style={styles.row}>
        {!showCustomer && booking.venue ? (
          <RemoteImage uri={venueCover(booking.venue)} style={styles.thumb} />
        ) : null}
        <View style={styles.body}>
          <StatusPill status={booking.status} />
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="label" color={colors.ink}>
            {when}
          </Text>
          {extra ? (
            <Text variant="caption" numberOfLines={1}>
              {extra}
            </Text>
          ) : null}
          {showCustomer && booking.notes ? (
            <Text variant="caption" numberOfLines={2}>
              “{booking.notes}”
            </Text>
          ) : null}
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  body: { flex: 1, gap: 4 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.md },
});
