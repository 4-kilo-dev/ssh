import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { usePullRefresh, useVenues } from "@/api/queries";
import type { VenueListItem } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { VenueCard } from "@/features/VenueCard";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Chip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { IconButton, TabHeader, layout } from "@/ui/Layout";
import { EmptyState, ErrorView, LoadingView } from "@/ui/States";

const GUEST_FILTERS = [0, 50, 100, 300, 500];

/** Explore: search + two quick filters + venue cards. Tap a card → venue page. */
export default function Explore() {
  const t = useT();
  const router = useRouter();
  const { account } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState(0);
  const [area, setArea] = useState<string | null>(null);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const venues = useVenues({ query: query || undefined, guests: guests || undefined });
  const { refreshing, onRefresh } = usePullRefresh(venues.refetch);

  const areas = useMemo(
    () => [...new Set((venues.data ?? []).map((v) => v.area))].sort((a, b) => a.localeCompare(b)),
    [venues.data]
  );
  const list = useMemo(
    () => (venues.data ?? []).filter((v) => !area || v.area === area),
    [venues.data, area]
  );

  const openVenue = (v: VenueListItem) =>
    router.push({ pathname: "/venue/[id]", params: { id: v.id, guests: guests ? String(guests) : "" } });

  const header = (
    <View>
      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t("searchPlaceholder")}
          maxFontSizeMultiplier={1.4}
        />
        {search ? (
          <IconButton icon="close" label={t("close")} onPress={() => setSearch("")} color={colors.muted} />
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layout.chipsRow}>
        {GUEST_FILTERS.map((n) => (
          <Chip
            key={n}
            label={n === 0 ? t("anySize") : `${n}+`}
            icon={n === 0 ? undefined : "people-outline"}
            selected={guests === n}
            onPress={() => setGuests(n)}
          />
        ))}
      </ScrollView>

      {areas.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={layout.chipsRow}>
          <Chip label={t("allAreas")} selected={area === null} onPress={() => setArea(null)} />
          {areas.map((a) => (
            <Chip key={a} label={a} icon="location-outline" selected={area === a} onPress={() => setArea(a)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={layout.screen}>
      <TabHeader
        title={t("exploreTitle")}
        right={
          <IconButton icon={account ? "person" : "person-outline"} label={t("meTitle")} onPress={() => router.push("/me")} />
        }
      />
      {venues.isPending ? (
        <>
          {header}
          <LoadingView />
        </>
      ) : venues.isError && !venues.data ? (
        <>
          {header}
          <ErrorView error={venues.error} onRetry={() => venues.refetch()} />
        </>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <View style={layout.padded}>
              <VenueCard venue={item} onPress={() => openVenue(item)} />
            </View>
          )}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          ListEmptyComponent={
            <EmptyState icon="search-outline" title={t("noVenues")} body={t("noVenuesBody")} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.xs,
    paddingLeft: space.md,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: space.md },
  listContent: { paddingBottom: space.xxl },
});
