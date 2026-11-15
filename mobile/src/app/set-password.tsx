import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { leaveAuthScreen } from "@/features/afterAuth";
import { SheetHeader } from "@/features/SheetHeader";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Notice, layout } from "@/ui/Layout";
import { useErrorMessage } from "@/ui/States";

/**
 * Account activation with a one-time code (the same token the Telegram bot
 * puts in its /onboard?token=… link). Also opens from the deep link
 * addisvenue://set-password?token=…
 */
export default function SetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const t = useT();
  const router = useRouter();
  const { activate } = useAuth();
  const errorMessage = useErrorMessage();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!token.trim()) return setError(t("requiredField"));
    if (password.length < 8) return setError(t("passwordTooShort"));
    if (password !== confirm) return setError(t("passwordsDontMatch"));
    setBusy(true);
    try {
      const account = await activate(token.trim(), password);
      leaveAuthScreen(router, account);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <SheetHeader title={t("activateTitle")} subtitle={t("activateBody")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!params.token ? (
          <Field
            label={t("activationCode")}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        <Field
          label={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint={t("passwordHint")}
        />
        <Field
          label={t("confirmPassword")}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <View style={styles.actions}>
          <Button title={busy ? t("saving") : t("save")} loading={busy} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  actions: { marginTop: space.md },
});
