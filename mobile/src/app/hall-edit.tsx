import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { venueApi, type HallInput } from "@/api/endpoints";
import { keys, useVenue } from "@/api/queries";
import type { HallSetting } from "@/api/types";
import { HALL_SETTINGS, SETTING_ICON } from "@/features/hallSetting";
import { SheetHeader } from "@/features/SheetHeader";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { Notice, layout } from "@/ui/Layout";
import { LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";

/** Add a hall (no hallId) or edit / delete one. */
export default function HallEdit() {
  const { venueId, hallId } = useLocalSearchParams<{ venueId: string; hallId?: string }>();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venueQ = useVenue(venueId);
  const existing = hallId ? venueQ.data?.halls.find((h) => h.id === hallId) : undefined;

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [setting, setSetting] = useState<HallSetting>("indoor");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(!hallId);
  const [errors, setErrors] = useState<{ name?: string; capacity?: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setCapacity(String(existing.capacity));
      setSetting(existing.setting);
      setNotes(existing.notes ?? "");
      setLoaded(true);
    }
  }, [existing, loaded]);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: keys.venue(venueId) });
    queryClient.invalidateQueries({ queryKey: ["venues"] });
    queryClient.invalidateQueries({ queryKey: keys.calendarAll(venueId) });
    router.back();
  };

  const save = useMutation({
    mutationFn: (input: HallInput) =>
      hallId ? venueApi.updateHall(venueId, hallId, input) : venueApi.createHall(venueId, input),
    onSuccess: done,
    onError: (err) => setError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => venueApi.deleteHall(venueId, hallId!),
    onSuccess: done,
    onError: (err) => setError(errorMessage(err)),
  });

  if (!loaded) return <LoadingView />;

  const submit = () => {
    setError(null);
    const cap = parseInt(capacity, 10);
    const next = {
      name: name.trim() ? undefined : t("requiredField"),
      capacity: Number.isFinite(cap) && cap > 0 ? undefined : t("invalidCapacity"),
    };
    setErrors(next);
    if (next.name || next.capacity) return;
    save.mutate({ name: name.trim(), capacity: cap, setting, notes: notes.trim() });
  };

  const confirmDelete = () =>
    Alert.alert(t("deleteHallConfirm"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={hallId ? t("editHall") : t("addHall")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t("hallName")} value={name} onChangeText={setName} error={errors.name} maxLength={80} />
        <Field
          label={t("capacity")}
          value={capacity}
          onChangeText={(v) => setCapacity(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          error={errors.capacity}
        />
        <Text variant="label" style={styles.label}>
          {t("setting")}
        </Text>
        <View style={[layout.wrap, styles.settings]}>
          {HALL_SETTINGS.map((s) => (
            <Chip
              key={s}
              label={t(`setting_${s}`)}
              icon={SETTING_ICON[s]}
              selected={setting === s}
              onPress={() => setSetting(s)}
            />
          ))}
        </View>
        <Field label={`${t("hallNotes")} (${t("optional")})`} value={notes} onChangeText={setNotes} multiline maxLength={500} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <View style={styles.actions}>
          <Button title={save.isPending ? t("saving") : t("save")} loading={save.isPending} onPress={submit} />
          {hallId ? (
            <Button
              title={t("deleteHall")}
              icon="trash-outline"
              variant="danger"
              loading={remove.isPending}
              onPress={confirmDelete}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  label: { marginBottom: space.sm },
  settings: { marginBottom: space.lg },
  actions: { gap: space.md, marginTop: space.md },
});
