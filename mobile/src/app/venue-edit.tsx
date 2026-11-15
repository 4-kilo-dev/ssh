import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { venueApi } from "@/api/endpoints";
import { keys, useVenue } from "@/api/queries";
import { SheetHeader } from "@/features/SheetHeader";
import { VenueForm } from "@/features/VenueForm";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { layout } from "@/ui/Layout";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";

export default function VenueEdit() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venueQ = useVenue(venueId);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: Parameters<typeof venueApi.update>[1]) => venueApi.update(venueId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: keys.venue(venueId) });
      router.back();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (venueQ.isPending) return <LoadingView />;
  if (venueQ.isError || !venueQ.data) return <ErrorView error={venueQ.error} onRetry={() => venueQ.refetch()} />;

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("editVenue")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VenueForm
          initial={venueQ.data.venue}
          submitLabel={t("save")}
          busy={save.isPending}
          error={error}
          onSubmit={(input) => {
            setError(null);
            save.mutate(input);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
});
