import { Alert, ScrollView, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { useLocale, type Locale } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Avatar, Card, Section, layout } from "@/ui/Layout";
import { Segmented } from "@/ui/Segmented";
import { Text } from "@/ui/Text";
import { formatPhone } from "@/utils/phone";

/** Account: who you are, language, help, sign out. Guests get Sign in / Create account. */
export default function Me() {
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const { account, signOut } = useAuth();

  const confirmSignOut = () =>
    Alert.alert(t("signOutConfirm"), undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("signOut"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          if (router.canDismiss()) router.dismissAll();
          router.replace("/");
        },
      },
    ]);

  return (
    <ScrollView style={layout.screen} contentContainerStyle={styles.content}>
      {account ? (
        <Card style={styles.profile}>
          <Avatar name={account.name} size={56} />
          <View style={layout.flex}>
            <Text variant="heading">{account.name}</Text>
            <Text color={colors.muted}>{formatPhone(account.phone)}</Text>
            <Text variant="caption">{t(`role_${account.role}`)}</Text>
          </View>
        </Card>
      ) : (
        <View style={styles.guest}>
          <Button title={t("signIn")} icon="log-in-outline" onPress={() => router.push("/sign-in")} />
          <Button title={t("createAccount")} variant="secondary" onPress={() => router.push("/sign-up")} />
        </View>
      )}

      <Section title={t("language")}>
        <Segmented<Locale>
          options={[
            { key: "en", label: "English" },
            { key: "am", label: "አማርኛ" },
          ]}
          value={locale}
          onChange={setLocale}
          style={styles.segmented}
        />
      </Section>

      {account ? (
        <Section title={t("help")}>
          <Button title={t("help")} icon="help-buoy-outline" variant="secondary" onPress={() => router.push("/support")} />
          <Button title={t("signOut")} icon="log-out-outline" variant="danger" onPress={confirmSignOut} />
        </Section>
      ) : null}

      <Text variant="caption" center style={styles.version}>
        {t("appName")} · {t("version", { v: Constants.expoConfig?.version ?? "1.0.0" })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xxl },
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg, marginHorizontal: space.lg },
  guest: { gap: space.md, paddingHorizontal: space.lg },
  version: { marginTop: space.xxl },
  segmented: { marginHorizontal: 0, marginBottom: 0 },
});
