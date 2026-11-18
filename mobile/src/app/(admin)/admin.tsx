import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { API_URL } from "@/config";
import { useT } from "@/i18n";
import { space } from "@/theme";
import { Button } from "@/ui/Button";
import { TabHeader, layout } from "@/ui/Layout";
import { EmptyState } from "@/ui/States";
import { openWebsite } from "@/utils/links";

/** Admins work on the website; the app only points them there. */
export default function AdminHome() {
  const t = useT();
  const router = useRouter();
  const { account } = useAuth();
  return (
    <View style={layout.screen}>
      <TabHeader title={t("adminTitle")} />
      <EmptyState
        icon="desktop-outline"
        title={account?.name ?? t("adminTitle")}
        body={t("adminBody")}
        actionLabel={t("openWebsite")}
        onAction={() => openWebsite(`${API_URL}/admin`, t("cannotOpen"))}
      />
      <View style={styles.footer}>
        <Button title={t("meTitle")} variant="secondary" icon="person-outline" onPress={() => router.push("/me")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { padding: space.lg, paddingBottom: space.xxl },
});
