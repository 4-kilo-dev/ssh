import { useState } from "react";
import { KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { venueApi } from "@/api/endpoints";
import { useMyVenue, usePullRefresh, useVenue } from "@/api/queries";
import { SETTING_ICON } from "@/features/hallSetting";
import { VenueForm } from "@/features/VenueForm";
import { useT } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Card, IconButton, Section, TabHeader, layout } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { EmptyState, ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";
import { venueCover } from "@/utils/images";

/** My venue: details, halls, and a link to see the page as customers do. */
export default function MyVenue() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venueQ = useMyVenue();
  const venue = venueQ.data ?? null;
  const detailQ = useVenue(venue?.id);
  const [createError, setCreateError] = useState<string | null>(null);
  const { refreshing, onRefresh } = usePullRefresh(async () => {
    await Promise.all([venueQ.refetch(), detailQ.refetch()]);
  });

  const create = useMutation({
    mutationFn: venueApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["venues"] }),
    onError: (err) => setCreateError(errorMessage(err)),
  });

  const header = (
    <TabHeader
      title={t("myVenueTitle")}
      right={<IconButton icon="person-outline" label={t("meTitle")} onPress={() => router.push("/me")} />}
    />
  );

  if (venueQ.isPending) {
    return (
      <View style={layout.screen}>
        {header}
        <LoadingView />
      </View>
    );
  }
  if (venueQ.isError) {
    return (
      <View style={layout.screen}>
        {header}
        <ErrorView error={venueQ.error} onRetry={() => venueQ.refetch()} />
      </View>
    );
  }

  // First time: create the venue right here.
  if (!venue) {
    return (
      <KeyboardAvoidingView behavior="padding" style={layout.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text color={colors.muted} style={styles.intro}>
            {t("setupVenueBody")}
          </Text>
          <VenueForm
            submitLabel={t("createVenue")}
            busy={create.isPending}
            error={createError}
            onSubmit={(input) => {
              setCreateError(null);
              create.mutate(input);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const halls = detailQ.data?.halls ?? [];

  return (
    <View style={layout.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        <Card style={styles.venueCard}>
          <RemoteImage uri={venueCover(venue)} style={styles.image} />
          <View style={styles.venueBody}>
            <Text variant="heading">{venue.name}</Text>
            <Text variant="caption">
              {venue.area} · {venue.type}
            </Text>
            <View style={styles.buttons}>
              <Button
                title={t("editVenue")}
                icon="create-outline"
                variant="secondary"
                compact
                onPress={() => router.push({ pathname: "/venue-edit", params: { venueId: venue.id } })}
                style={layout.flex}
              />
              <Button
                title={t("previewVenue")}
                icon="eye-outline"
                variant="secondary"
                compact
                onPress={() => router.push(`/venue/${venue.id}`)}
                style={layout.flex}
              />
            </View>
          </View>
        </Card>

        <Section
          title={t("halls")}
          right={
            <Button
              title={t("addHall")}
              icon="add"
              compact
              variant="ghost"
              onPress={() => router.push({ pathname: "/hall-edit", params: { venueId: venue.id } })}
            />
          }
        >
          {detailQ.isPending ? (
            <LoadingView />
          ) : halls.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title={t("noHalls")}
              body={t("noHallsBody")}
              actionLabel={t("addHall")}
              onAction={() => router.push({ pathname: "/hall-edit", params: { venueId: venue.id } })}
            />
          ) : (
            halls.map((h) => (
              <Card
                key={h.id}
                style={styles.hallRow}
                onPress={() => router.push({ pathname: "/hall-edit", params: { venueId: venue.id, hallId: h.id } })}
                accessibilityLabel={`${t("editHall")}: ${h.name}`}
              >
                <Icon name={SETTING_ICON[h.setting]} size={22} color={colors.teal} />
                <View style={layout.flex}>
                  <Text variant="label">{h.name}</Text>
                  <Text variant="caption">
                    {t("guestsCount", { n: h.capacity })} · {t(`setting_${h.setting}`)}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: space.lg, paddingBottom: space.xxl * 2 },
  intro: { marginBottom: space.lg },
  content: { paddingBottom: space.xxl },
  venueCard: { marginHorizontal: space.lg, padding: 0, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 2, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  venueBody: { padding: space.lg, gap: 2 },
  buttons: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  hallRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
});
