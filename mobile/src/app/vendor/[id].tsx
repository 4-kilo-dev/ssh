import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useVendor } from "@/api/queries";
import { VendorBadges } from "@/features/VendorCard";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "@/ui/Button";
import { BottomBar, Card, InfoRow, layout } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { ErrorView, LoadingView } from "@/ui/States";
import { Text } from "@/ui/Text";
import { vendorImage } from "@/utils/images";
import { callPhone, openTelegram } from "@/utils/links";
import { formatPhone } from "@/utils/phone";

export default function VendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { width } = useWindowDimensions();
  const vendorQ = useVendor(id);

  if (vendorQ.isPending) return <LoadingView />;
  if (vendorQ.isError || !vendorQ.data) return <ErrorView error={vendorQ.error} onRetry={() => vendorQ.refetch()} />;

  const v = vendorQ.data;

  return (
    <View style={layout.screen}>
      <Stack.Screen options={{ title: v.name }} />
      <ScrollView contentContainerStyle={layout.scrollContent}>
        <RemoteImage uri={vendorImage(v)} style={{ width, height: width * 0.56 }} />
        <View style={styles.body}>
          <VendorBadges vendor={v} />
          <Text variant="title">{v.name}</Text>
          <Text color={colors.muted}>{[v.category, v.area].filter(Boolean).join(" · ")}</Text>

          <Card style={styles.card}>
            {v.priceRange ? <InfoRow icon="pricetag-outline" label={t("priceRange")} value={v.priceRange} /> : null}
            {v.area ? <InfoRow icon="location-outline" label={t("area")} value={v.area} /> : null}
            {v.phone ? <InfoRow icon="call-outline" label={t("phone")} value={formatPhone(v.phone)} /> : null}
            {v.email ? <InfoRow icon="mail-outline" label="Email" value={v.email} /> : null}
          </Card>

          {v.description ? (
            <View style={styles.about}>
              <Text variant="heading">{t("about")}</Text>
              <Text>{v.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {v.phone ? (
        <BottomBar>
          <Button
            title={t("telegram")}
            icon="paper-plane-outline"
            variant="secondary"
            onPress={() => openTelegram(v.phone!, t("cannotOpen"))}
            style={layout.flex}
          />
          <Button title={t("call")} icon="call" onPress={() => callPhone(v.phone!, t("cannotOpen"))} style={layout.flex} />
        </BottomBar>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.sm },
  card: { marginTop: space.md },
  about: { marginTop: space.lg, gap: space.sm },
});
