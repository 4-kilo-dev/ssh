import { useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type TextInputInstance } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { leaveAuthScreen } from "@/features/afterAuth";
import { SheetHeader } from "@/features/SheetHeader";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { Button } from "@/ui/Button";
import { Field, FieldButton } from "@/ui/Field";
import { Notice, layout } from "@/ui/Layout";
import { useErrorMessage } from "@/ui/States";
import { normalizeEthiopianPhone } from "@/utils/phone";

export default function SignUp() {
  const t = useT();
  const router = useRouter();
  const { signUp } = useAuth();
  const errorMessage = useErrorMessage();
  const phoneRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const normalized = normalizeEthiopianPhone(phone);
    const next = {
      name: name.trim() ? undefined : t("nameRequired"),
      phone: normalized ? undefined : t("invalidPhone"),
      password: password.length >= 8 ? undefined : t("passwordTooShort"),
    };
    setErrors(next);
    if (next.name || next.phone || next.password || !normalized) return;

    setBusy(true);
    try {
      const account = await signUp(name.trim(), normalized, password);
      leaveAuthScreen(router, account);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("createAccountTitle")} subtitle={t("createAccountBody")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field
          label={t("name")}
          value={name}
          onChangeText={setName}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          error={errors.name}
          maxLength={80}
          autoFocus
        />
        <Field
          ref={phoneRef}
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("phonePlaceholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.phone}
        />
        <Field
          ref={passwordRef}
          label={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
          hint={t("passwordHint")}
          error={errors.password}
          right={
            <FieldButton
              label={showPassword ? t("hidePassword") : t("showPassword")}
              onPress={() => setShowPassword((s) => !s)}
            />
          }
        />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <View style={styles.actions}>
          <Button title={busy ? t("creating") : t("createAccount")} loading={busy} onPress={submit} />
          <Button title={t("haveAccount")} variant="ghost" onPress={() => router.replace("/sign-in")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  actions: { gap: space.sm, marginTop: space.md },
});
