import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorApi, type VendorInput } from "@/api/endpoints";
import { keys, useMyVendors, usePullRefresh } from "@/api/queries";
import type { Vendor } from "@/api/types";
import { VendorCard } from "@/features/VendorCard";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { IconButton, Notice, TabHeader, layout } from "@/ui/Layout";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";

const CATEGORIES = ["Photography", "Catering", "Decor", "Music & sound", "Beauty"];

/** Vendor home: preview of the listing as customers see it + edit form. */
export default function Listing() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const mine = useMyVendors();
  const vendor: Vendor | null = mine.data?.[0] ?? null;
  const { refreshing, onRefresh } = usePullRefresh(mine.refetch);

  const [form, setForm] = useState<VendorInput>({ name: "", category: CATEGORIES[0] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name,
        category: vendor.category,
        description: vendor.description ?? "",
        priceRange: vendor.priceRange ?? "",
        phone: vendor.phone ?? "",
        email: vendor.email ?? "",
        area: vendor.area ?? "",
      });
    }
  }, [vendor]);

  const save = useMutation({
    mutationFn: (input: VendorInput) => (vendor ? vendorApi.update(vendor.id, input) : vendorApi.create(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.myVendors });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      Alert.alert(t("saved"));
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const set = (key: keyof VendorInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    setError(null);
    if (!form.name.trim() || !form.category.trim()) {
      setError(t("requiredField"));
      return;
    }
    const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);
    save.mutate({
      name: form.name.trim(),
      category: form.category.trim(),
      description: clean(form.description),
      priceRange: clean(form.priceRange),
      phone: clean(form.phone),
      email: clean(form.email),
      area: clean(form.area),
    });
  };

  const header = (
    <TabHeader
      title={t("listingTitle")}
      right={<IconButton icon="person-outline" label={t("meTitle")} onPress={() => router.push("/me")} />}
    />
  );

  if (mine.isPending) {
    return (
      <View style={layout.screen}>
        {header}
        <LoadingView />
      </View>
    );
  }
  if (mine.isError && !mine.data) {
    return (
      <View style={layout.screen}>
        {header}
        <ErrorView error={mine.error} onRetry={() => mine.refetch()} />
      </View>
    );
  }

  const categories = CATEGORIES.includes(form.category) ? CATEGORIES : [...CATEGORIES, form.category];

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        {vendor ? (
          <View style={styles.preview}>
            <Text variant="caption">{t("listingBody")}</Text>
            <VendorCard vendor={vendor} />
            {!vendor.verified ? <Notice tone="warning">{`${t("status")}: ${t("notVerified")}`}</Notice> : null}
          </View>
        ) : null}

        <Field label={t("listingName")} value={form.name} onChangeText={set("name")} maxLength={120} />
        <Text variant="label" style={styles.label}>
          {t("category")}
        </Text>
        <View style={[layout.wrap, styles.categories]}>
          {categories.map((c) => (
            <Chip key={c} label={c} selected={form.category === c} onPress={() => set("category")(c)} />
          ))}
        </View>
        <Field label={`${t("priceRange")} (${t("optional")})`} value={form.priceRange ?? ""} onChangeText={set("priceRange")} placeholder="ETB 20,000 – 60,000" />
        <Field label={`${t("area")} (${t("optional")})`} value={form.area ?? ""} onChangeText={set("area")} placeholder={t("venueAreaPlaceholder")} />
        <Field label={`${t("phone")} (${t("optional")})`} value={form.phone ?? ""} onChangeText={set("phone")} keyboardType="phone-pad" placeholder={t("phonePlaceholder")} />
        <Field label={`Email (${t("optional")})`} value={form.email ?? ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
        <Field label={`${t("description")} (${t("optional")})`} value={form.description ?? ""} onChangeText={set("description")} multiline maxLength={2000} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button
          title={save.isPending ? t("saving") : vendor ? t("save") : t("createListing")}
          loading={save.isPending}
          onPress={submit}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  preview: { gap: space.sm, marginBottom: space.xl },
  label: { marginBottom: space.sm },
  categories: { marginBottom: space.lg },
  button: { marginTop: space.md },
});
