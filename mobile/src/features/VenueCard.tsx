import { StyleSheet, View } from "react-native";
import type { VenueListItem } from "@/api/types";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Card } from "@/ui/Layout";
import { Icon } from "@/ui/Icon";
import { RemoteImage } from "@/ui/Remote";
import { Text } from "@/ui/Text";
import { venueCover } from "@/utils/images";

export function VenueCard({ venue, onPress }: { venue: VenueListItem; onPress: () => void }) {
  const t = useT();
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`${venue.name}, ${venue.area}`}>
      <RemoteImage uri={venueCover(venue)} style={styles.image} />
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={1}>
          {venue.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {venue.area} · {venue.type}
        </Text>
        <View style={styles.meta}>
          {venue.maxCapacity > 0 ? (
            <View style={styles.metaItem}>
              <Icon name="people-outline" size={16} color={colors.teal} />
              <Text variant="label">{t("upTo", { n: venue.maxCapacity })}</Text>
            </View>
          ) : null}
          {venue.hallCount > 0 ? (
            <View style={styles.metaItem}>
              <Icon name="business-outline" size={16} color={colors.teal} />
              <Text variant="label">
                {venue.hallCount === 1 ? t("hallOne") : t("hallsCount", { n: venue.hallCount })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 16 / 9, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  body: { padding: space.lg, gap: 2 },
  meta: { flexDirection: "row", gap: space.lg, marginTop: space.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
