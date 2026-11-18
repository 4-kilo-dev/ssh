import { useState } from "react";
import { View } from "react-native";
import type { VenueInput } from "@/api/endpoints";
import type { Venue } from "@/api/types";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { Notice, layout } from "@/ui/Layout";
import { Text } from "@/ui/Text";
import { VENUE_TYPES } from "@/utils/images";

/** Create / edit venue details. */
export function VenueForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  initial?: Venue | null;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (input: VenueInput) => void;
}) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [type, setType] = useState(initial?.type ?? VENUE_TYPES[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [policies, setPolicies] = useState(initial?.policies ?? "");
  const [amenities, setAmenities] = useState((initial?.amenities ?? []).join(", "));
  const [missing, setMissing] = useState(false);

  const types = VENUE_TYPES.includes(type) ? VENUE_TYPES : [...VENUE_TYPES, type];

  const submit = () => {
    if (!name.trim() || !area.trim() || !type) {
      setMissing(true);
      return;
    }
    setMissing(false);
    onSubmit({
      name: name.trim(),
      area: area.trim(),
      type,
      description: description.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      policies: policies.trim(),
      amenities: amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
  };

  return (
    <View>
      <Field
        label={t("venueName")}
        value={name}
        onChangeText={setName}
        error={missing && !name.trim() ? t("requiredField") : null}
        maxLength={120}
      />
      <Field
        label={t("venueArea")}
        value={area}
        onChangeText={setArea}
        placeholder={t("venueAreaPlaceholder")}
        error={missing && !area.trim() ? t("requiredField") : null}
        maxLength={80}
      />
      <Text variant="label" style={{ marginBottom: space.sm }}>
        {t("venueType")}
      </Text>
      <View style={[layout.wrap, { marginBottom: space.lg }]}>
        {types.map((v) => (
          <Chip key={v} label={v} selected={type === v} onPress={() => setType(v)} />
        ))}
      </View>
      <Field label={`${t("description")} (${t("optional")})`} value={description} onChangeText={setDescription} multiline maxLength={2000} />
      <Field
        label={`${t("contactPhone")} (${t("optional")})`}
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        placeholder={t("phonePlaceholder")}
      />
      <Field
        label={`${t("contactEmail")} (${t("optional")})`}
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label={`${t("amenities")} (${t("optional")})`}
        value={amenities}
        onChangeText={setAmenities}
        hint={t("amenitiesHint")}
      />
      <Field label={`${t("policies")} (${t("optional")})`} value={policies} onChangeText={setPolicies} multiline maxLength={2000} />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title={busy ? t("saving") : submitLabel} loading={busy} onPress={submit} style={{ marginTop: space.md }} />
    </View>
  );
}
