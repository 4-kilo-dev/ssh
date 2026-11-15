import { StyleSheet, View } from "react-native";
import type { Vendor } from "@/api/types";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Card } from "@/ui/Layout";
import { Icon } from "@/ui/Icon";
import { RemoteImage } from "@/ui/Remote";
import { Text } from "@/ui/Text";
import { vendorImage } from "@/utils/images";

export function VendorBadges({ vendor }: { vendor: Vendor }) {
  const t = useT();
  if (!vendor.verified && vendor.boostStatus !== "boosted") return null;
  return (
    <View style={styles.badges}>
      {vendor.boostStatus === "boosted" ? (
        <View style={[styles.badge, { backgroundColor: colors.warningBg }]}>
          <Icon name="star" size={12} color={colors.warning} />
          <Text variant="caption" color={colors.warning} bold>
            {t("featured")}
          </Text>
        </View>
      ) : null}
      {vendor.verified ? (
        <View style={[styles.badge, { backgroundColor: colors.successBg }]}>
          <Icon name="shield-checkmark" size={12} color={colors.success} />
          <Text variant="caption" color={colors.success} bold>
            {t("verified")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function VendorCard({ vendor, onPress }: { vendor: Vendor; onPress?: () => void }) {
  const meta = [vendor.category, vendor.area].filter(Boolean).join(" · ");
  return (
    <Card onPress={onPress} accessibilityLabel={`${vendor.name}, ${meta}`}>
      <View style={styles.row}>
        <RemoteImage uri={vendorImage(vendor)} style={styles.thumb} />
        <View style={styles.body}>
          <VendorBadges vendor={vendor} />
          <Text variant="heading" numberOfLines={1}>
            {vendor.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {meta}
          </Text>
          {vendor.priceRange ? (
            <Text variant="label" color={colors.teal} numberOfLines={1}>
              {vendor.priceRange}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  body: { flex: 1, gap: 3 },
  badges: { flexDirection: "row", gap: space.xs },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
