import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { usePullRefresh, useVendors } from "@/api/queries";
import { VendorCard } from "@/features/VendorCard";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { Chip } from "@/ui/Chip";
import { TabHeader, layout } from "@/ui/Layout";
import { EmptyState, ErrorView, LoadingView } from "@/ui/States";

/** Vendors: category chips + ranked list (featured, then verified). Tap → profile → Call. */
export default function VendorsTab() {
  const t = useT();
  const router = useRouter();
  const vendors = useVendors();
  const [category, setCategory] = useState<string | null>(null);
  const { refreshing, onRefresh } = usePullRefresh(vendors.refetch);

  const categories = useMemo(
    () => [...new Set((vendors.data ?? []).map((v) => v.category))].sort((a, b) => a.localeCompare(b)),
    [vendors.data]
  );
  const list = useMemo(
    () => (vendors.data ?? []).filter((v) => !category || v.category === category),
    [vendors.data, category]
  );

  const chips =
    categories.length > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layout.chipsRow}>
        <Chip label={t("allCategories")} selected={category === null} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
    ) : undefined;

  return (
    <View style={layout.screen}>
      <TabHeader title={t("vendorsTitle")} />
      {vendors.isPending ? (
        <LoadingView />
      ) : vendors.isError && !vendors.data ? (
        <ErrorView error={vendors.error} onRetry={() => vendors.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={chips}
          renderItem={({ item }) => (
            <View style={layout.padded}>
              <VendorCard vendor={item} onPress={() => router.push(`/vendor/${item.id}`)} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          ListEmptyComponent={<EmptyState icon="sparkles-outline" title={t("noVendors")} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
});
