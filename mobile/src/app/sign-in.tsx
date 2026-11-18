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

export default function SignIn() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useAuth();
  const errorMessage = useErrorMessage();
  const passwordRef = useRef<TextInputInstance>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) {
      setPhoneError(t("invalidPhone"));
      return;
    }
    setPhoneError(null);
    if (!password) {
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const account = await signIn(normalized, password);
      leaveAuthScreen(router, account);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("signInTitle")} subtitle={t("signInBody")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("phonePlaceholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={phoneError}
          autoFocus
        />
        <Field
          ref={passwordRef}
          label={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
          right={
            <FieldButton
              label={showPassword ? t("hidePassword") : t("showPassword")}
              onPress={() => setShowPassword((s) => !s)}
            />
          }
        />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <View style={styles.actions}>
          <Button title={busy ? t("signingIn") : t("signIn")} loading={busy} onPress={submit} />
          <Button title={t("noAccount")} variant="ghost" onPress={() => router.replace("/sign-up")} />
          <Button title={t("activate")} variant="ghost" onPress={() => router.replace("/set-password")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  actions: { gap: space.sm, marginTop: space.md },
});
